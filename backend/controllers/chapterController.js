// const { GoogleGenerativeAI } = require('@google/generative-ai');
// const { google } = require('googleapis');
// const youtube = google.youtube('v3');
// const Course = require('../models/Course');

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// const generateChapterContent = async (req, res) => {
//     try {
//         const { courseId } = req.params;
//         const course = await Course.findById(courseId);

//         if (!course) {
//             return res.status(404).json({ error: 'Course not found' });
//         }

//         // Process each chapter sequentially
//         for (const chapter of course.chapters) {
//             // Construct a more specific search query
//             const searchQuery = `${course.topic} ${chapter.title} programming tutorial -gaming -gameplay`;
            
//             const searchResult = await youtube.search.list({
//                 key: process.env.YOUTUBE_API_KEY,
//                 part: ['snippet'],
//                 q: searchQuery,
//                 type: ['video'],
//                 maxResults: 3,
//                 relevanceLanguage: 'en',
//                 videoDuration: 'medium',
//                 order: 'relevance',
//                 safeSearch: 'strict',
//                 topicId: '/m/01k8wb'  // Computer Programming topic
//             });

//             const videoPromises = searchResult.data.items.map(async (item) => {
//                 const videoData = await youtube.videos.list({
//                     key: process.env.YOUTUBE_API_KEY,
//                     part: ['snippet', 'statistics', 'contentDetails'],
//                     id: [item.id.videoId]
//                 });

//                 const videoDetails = videoData.data.items[0].snippet;
//                 const model = genAI.getGenerativeModel({ model: "gemini-3.7-flash" });

//                 const prompt = `Create a JSON object for this educational programming video about "${chapter.title}". Return ONLY a valid JSON object:
//                 {
//                     "summary": "Technical summary focusing on ${chapter.title}",
//                     "codeBlocks": [{"language": "language name", "code": "code here", "explanation": "explanation here"}],
//                     "keyPoints": ["point1", "point2"]
//                 }

//                 Video: "${videoDetails.title}"
//                 Description: ${videoDetails.description}

//                 Rules:
//                 1. Focus only on ${chapter.title} related content
//                 2. Include only relevant code examples
//                 3. Return valid JSON only`;

//                 const result = await model.generateContent(prompt);
//                 let content = await result.response.text();
//                 content = content.replace(/```json|```/g, '').trim();
                
//                 try {
//                     const parsedContent = JSON.parse(content);
//                     return {
//                         videoUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
//                         videoTitle: videoDetails.title,
//                         ...parsedContent
//                     };
//                 } catch (parseError) {
//                     console.error(`JSON parsing error for chapter ${chapter.title}:`, content);
//                     return {
//                         videoUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
//                         videoTitle: videoDetails.title,
//                         summary: "Failed to generate content",
//                         codeBlocks: [],
//                         keyPoints: []
//                     };
//                 }
//             });

//             const videoContents = await Promise.all(videoPromises);
//             chapter.content = videoContents;
//         }

//         await course.save();
//         res.json(course);
//     } catch (error) {
//         console.error('Course content generation error:', error);
//         res.status(500).json({ 
//             error: 'Failed to generate course content',
//             details: error.message
//         });
//     }
// };

// module.exports = {
//     generateChapterContent
// };


const { GoogleGenerativeAI } = require('@google/generative-ai');
const { google } = require('googleapis');
const Course = require('../models/Course');

const youtube = google.youtube('v3');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Retry temporary Gemini API errors with exponential backoff.

async function generateWithRetry(model, prompt, maxRetries = 3) {
    for (let attempt = 0; ; attempt++) {
        try {
            // Stay below the free-tier request limit as much as possible.
            await sleep(4500);

            return await model.generateContent(prompt);
        } catch (error) {
            const status = error.status;
            const shouldRetry =
                status === 429 ||
                status === 503 ||
                (status >= 500 && status < 600);

            if (!shouldRetry || attempt >= maxRetries) {
                throw error;
            }

            // The API may require a longer wait after a quota error.
            const delay =
                status === 429
                    ? 40000
                    : 2000 * Math.pow(2, attempt);

            console.log(
                `Gemini returned ${status}. Waiting ${delay / 1000}s before retry ${attempt + 1}/${maxRetries}`
            );

            await sleep(delay);
        }
    }
}

const generateChapterContent = async (req, res) => {
    try {
        const { courseId } = req.params;
        const course = await Course.findById(courseId);

        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }

        // Use the model configured for this project.
        const model = genAI.getGenerativeModel({
    model: 'gemini-3.5-flash-lite',
    generationConfig: {
        responseMimeType: 'application/json'
    }
});

        // Process chapters one at a time.
        for (const chapter of course.chapters) {
            const searchQuery =
                `${course.topic} ${chapter.title} programming tutorial -gaming -gameplay`;

            const searchResult = await youtube.search.list({
                key: process.env.YOUTUBE_API_KEY,
                part: ['snippet'],
                q: searchQuery,
                type: ['video'],
                maxResults: 3,
                relevanceLanguage: 'en',
                videoDuration: 'medium',
                order: 'relevance',
                safeSearch: 'strict',
                topicId: '/m/01k8wb'
            });

            const videoContents = [];

            // Process videos sequentially to avoid concurrent Gemini requests.
            for (const item of searchResult.data.items || []) {
                try {
                    const videoData = await youtube.videos.list({
                        key: process.env.YOUTUBE_API_KEY,
                        part: ['snippet', 'statistics', 'contentDetails'],
                        id: [item.id.videoId]
                    });

                    const videoDetails = videoData.data.items[0]?.snippet;

                    if (!videoDetails) {
                        continue;
                    }

                    const prompt = `Create a JSON object for this educational programming video about "${chapter.title}". Return ONLY a valid JSON object:
                    {
                        "summary": "Technical summary focusing on ${chapter.title}",
                        "codeBlocks": [
                            {
                                "language": "language name",
                                "code": "code here",
                                "explanation": "explanation here"
                            }
                        ],
                        "keyPoints": ["point1", "point2"]
                    }

                    Video: "${videoDetails.title}"
                    Description: ${videoDetails.description || ''}

                    Rules:
                    1. Focus only on ${chapter.title} related content.
                    2. Include only relevant code examples.
                    3. Return valid JSON only.`;

                    const result = await generateWithRetry(model, prompt);

                    let content = result.response.text();
                    content = content
                        .replace(/```json|```/g, '')
                        .trim();

                    try {
                        const parsedContent = JSON.parse(content);

                        videoContents.push({
                            videoUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
                            videoTitle: videoDetails.title,
                            ...parsedContent
                        });
                    } catch (parseError) {
                        console.error(
                            `JSON parsing error for chapter "${chapter.title}":`,
                            parseError.message
                        );

                        videoContents.push({
                            videoUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
                            videoTitle: videoDetails.title,
                            summary: 'Failed to generate content',
                            codeBlocks: [],
                            keyPoints: []
                        });
                    }
                } catch (error) {
                    console.error(
                        `Failed to process video for chapter "${chapter.title}":`,
                        error.message
                    );

                    videoContents.push({
                        videoUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
                        videoTitle: item.snippet?.title || 'Video',
                        summary: 'Content generation temporarily unavailable. Please try again.',
                        codeBlocks: [],
                        keyPoints: []
                    });
                }
            }

            chapter.content = videoContents;
        }

        await course.save();

        return res.json(course);
    } catch (error) {
        console.error('Course content generation error:', error);

        return res.status(500).json({
            error: 'Failed to generate course content',
            details: error.message
        });
    }
};

module.exports = {
    generateChapterContent
};