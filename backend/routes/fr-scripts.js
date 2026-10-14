import '@tensorflow/tfjs-node';
import * as faceapi from 'face-api.js';
import { Canvas, Image } from 'canvas';
import path from 'path';
import { fileURLToPath } from 'url';
import * as tf from '@tensorflow/tfjs-node';
import { readUploadBuffer } from '../lib/storage.mjs';

faceapi.env.monkeyPatch({ Canvas, Image });
tf.enableProdMode();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const modelsPath = path.join(__dirname, '..', 'models');

let modelsPromise;

function ensureModels() {
  if (!modelsPromise) {
    modelsPromise = (async () => {
      await tf.setBackend('tensorflow');
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromDisk(modelsPath),
        faceapi.nets.faceLandmark68Net.loadFromDisk(modelsPath),
        faceapi.nets.faceRecognitionNet.loadFromDisk(modelsPath)
      ]);
    })();
  }
  return modelsPromise;
}

async function loadImage(imagePath) {
  if (!imagePath || typeof imagePath !== 'string') {
    throw new Error(`Invalid image path: ${imagePath}`);
  }

  const buffer = await readUploadBuffer(imagePath);
  if (!buffer) {
    throw new Error(`File does not exist: ${imagePath}`);
  }

  const img = new Image();
  img.src = buffer;
  return img;
}

async function filterImagesByName(images, profilePics) {
  await ensureModels();

  const imageScores = {};
  for (const img of images) {
    imageScores[img.url] = 0;
  }

  for (const profilePic of profilePics) {
    let refFace;
    try {
      refFace = await loadImage(profilePic);
    } catch (err) {
      console.error(`Error loading profile picture ${profilePic}:`, err);
      continue;
    }

    const refDescriptors = await faceapi.detectAllFaces(refFace)
      .withFaceLandmarks()
      .withFaceDescriptors();

    if (!refDescriptors.length) {
      continue;
    }

    const matcher = new faceapi.FaceMatcher(refDescriptors);

    for (const img of images) {
      try {
        const testFace = await loadImage(img.url);
        const testDescriptors = await faceapi.detectAllFaces(testFace)
          .withFaceLandmarks()
          .withFaceDescriptors();

        for (const desc of testDescriptors) {
          const match = matcher.findBestMatch(desc.descriptor);
          if (match.distance < 0.6) {
            imageScores[img.url] += 1;
          }
        }
      } catch (err) {
        console.error(`Error processing image ${img.url}:`, err);
      }
    }
  }

  return images
    .filter((img) => imageScores[img.url] > 0)
    .sort((a, b) => imageScores[b.url] - imageScores[a.url]);
}

export { filterImagesByName };
