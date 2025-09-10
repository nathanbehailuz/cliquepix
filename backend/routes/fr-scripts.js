import '@tensorflow/tfjs-node';

import db from '../db/db.mjs';
const { User, Media } = db;
let faceMatcher; 
import * as faceapi from 'face-api.js';
import { Canvas, Image } from 'canvas';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import * as tf from '@tensorflow/tfjs-node';
// ... rest of your imports
faceapi.env.monkeyPatch({ Canvas, Image });
tf.enableProdMode();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const modelsPath = path.join(__dirname, '..', 'models');

async function loadImage(imagePath) {
    if (!imagePath || imagePath === '$__' || typeof imagePath !== 'string') {
        throw new Error(`Invalid image path: ${imagePath}`);
    }

    const img = new Image();
    const cleanPath = imagePath.replace('../../', '');
    const absolutePath = path.join(__dirname, '..', '..', cleanPath);
    
    console.log('Loading image from:', absolutePath);
    
    if (!fs.existsSync(absolutePath)) {
        throw new Error(`File does not exist at path: ${absolutePath}`);
    }
    
    img.src = fs.readFileSync(absolutePath);
    return img;
}

async function filterImagesByName(images, names, user, profilePics) {  
    // Load models with explicit backend specification
    await tf.setBackend('tensorflow');
    await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromDisk(modelsPath),
        faceapi.nets.faceLandmark68Net.loadFromDisk(modelsPath),
        faceapi.nets.faceRecognitionNet.loadFromDisk(modelsPath)
    ]);

    const imageScores = {};
    for (const img of images) {
        imageScores[img.url] = 0;
    }

    // For each profile picture
    for (const profilePic of profilePics) {
        const refFace = await loadImage(profilePic);
        const refDescriptors = await faceapi.detectAllFaces(refFace)
            .withFaceLandmarks()
            .withFaceDescriptors();

        if (!refDescriptors.length) continue; // Skip if no face detected in profile pic
        
        // Create matcher for this reference face
        const matcher = new faceapi.FaceMatcher(refDescriptors);

        // Check against each image
        for (const img of images) {
            try {
                const testFace = await loadImage(img.url);
                const testDescriptors = await faceapi.detectAllFaces(testFace)
                    .withFaceLandmarks()
                    .withFaceDescriptors();

                // Check each detected face in the test image
                for (const desc of testDescriptors) {
                    const match = matcher.findBestMatch(desc.descriptor);
                    if (match.distance < 0.6) { // Lower distance means better match
                        imageScores[img.url] += 1;
                    }
                }
            } catch (err) {
                console.error(`Error processing image ${img.url}:`, err);
            }
        }
    }

    // Filter and sort results
    const sortedImages = Object.entries(imageScores)
        .filter(([url, score]) => score > 0)  // Keep only images with matches
        .sort(([, a], [, b]) => b - a)    // Sort by score descending
        .map(([url]) => url);

    // Get the corresponding Media objects
    return await Media.find({ url: { $in: sortedImages } });
}

// Function to check if an image matches any of the names
async function isImageMatching(media, names, user) {
    const image = await loadImage(media.url); 

    const detections = await faceapi.detectAllFaces(image).withFaceLandmarks().withFaceDescriptors();

    for (const detection of detections) {
        const descriptor = detection.descriptor;
        const label = faceMatcher.findBestMatch(descriptor).toString(); 

        if (names.includes(label.toLowerCase())) {
            return media; // Return the media if it matches
        }
    }

    return null; // Return null if no match
}

// //facial recognition
// const run = async()=>{
//     //we need to load our models
//     //loading the models is going to use await
//     await Promise.all([
//         faceapi.nets.ssdMobilenetv1.loadFromUri(`file://${modelsPath}`),
//         faceapi.nets.faceLandmark68Net.loadFromUri(`file://${modelsPath}`),
//         faceapi.nets.faceRecognitionNet.loadFromUri(`file://${modelsPath}`),
//         faceapi.nets.ageGenderNet.loadFromUri(`file://${modelsPath}`),
//     ])

//     // Use loadImage instead of faceapi.fetchImage
//     const refFace = await loadImage('path/to/your/reference/image.jpg')
//     const facesToCheck = await loadImage('path/to/your/image/to/check.jpg')

//     //we grab the reference image, and hand it to detectAllFaces method
//     let refFaceAiData = await faceapi.detectAllFaces(refFace).withFaceLandmarks().withFaceDescriptors()
//     let facesToCheckAiData = await faceapi.detectAllFaces(facesToCheck).withFaceLandmarks().withFaceDescriptors()
//     // console.log(faceAIData)

//     //get the canvas, and set it on top of the image
//     //and make it the same size
//     const canvas = document.getElementById('canvas')
//     faceapi.matchDimensions(canvas,facesToCheck)

//     //we need to make a face matcher!!
//     //FaceMatcher is a constructor in faceapi
//     //we hand it our reference AI data
//     faceMatcher = new faceapi.FaceMatcher(refFaceAiData)
//     facesToCheckAiData = faceapi.resizeResults(facesToCheckAiData,facesToCheck)

//     //loop through all of hte faces in our imageToCheck and compare to our reference datta
//     facesToCheckAiData.forEach(face=>{
//         const { detection, descriptor } = face
//         //make a label, using the default
//         let label = faceMatcher.findBestMatch(descriptor).toString()
//         console.log(label)
//         if(label.includes("unknown")){
//             return
//         }
//         let options = { label: "Jordan"}
//         const drawBox = new faceapi.draw.DrawBox(detection.box,options)
//         drawBox.draw(canvas)
//     })

// }   

export {isImageMatching, filterImagesByName}
