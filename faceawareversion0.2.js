let model, classifier, canvas, ctx, videoWidth, videoHeight;
let blinkCount = 0;
let smileCounter = 0;
let isSpoofingChecked = false;
let isGenuine = false;
let eyesClosed = 0;
let maxSmileCount = 5
const maxSpoofChecks = 40;
const minRealChecks = 25;
let realFaceCount = 0;
let spoofFaceCount = 0;
let totalChecks = 0;
let facemeshModel; // Declare variables outside the setupPage function
let importedFaceApi = document.createElement('script');
importedFaceApi.src = `./proctoringMonitor/face-aware/face-api.min.js`;
// importedFaceApi.src = './face-api.min.js'
document.head.appendChild(importedFaceApi);
let faceapivideo;
let labeledFaceDescriptors;
let faceMatcher;
let isLabeledImagesLoaded = false;
let isModelsLoaded = false;
let localstream;
let messageToShown;
let authenticate;
let faceauthMdl;
let videoForSFMatch;
let canvasForSFMatch;
let displaySizeForSFMatch;
var naturalExp = true;
var smileExp = true;
var matchCount = 0;
let maxTimeCount = 0;
let maxTime;
const returnObject = { isMatch: false, message: ``, nextExp: `Show your face for authentication` };
let distanceThreshold = 60;
let pythonServerApi;
var apiSwitchFlag;
const xhttpSync = new XMLHttpRequest();
let originalBase64Image;
let userDetailsFA;
let lastSpoofCheckTime = 0;
var returnPhoto;
let checkOriginalimage = true;
// New counters for periodic matching
let spoofChecksSinceLastMatch = 0;
let smilesSinceLastMatch = 0;

async function loadModels(faceauthmodel) {
    faceauthMdl = faceauthmodel;
    console.log("faceapi ::: " + faceauthmodel + "    " + faceauthMdl);
    await waitToLoadFaceApi();
    Promise.all([
        faceapi.nets.faceLandmark68Net.loadFromUri(faceauthmodel),
        faceapi.nets.faceRecognitionNet.loadFromUri(faceauthmodel),
        faceapi.nets.faceExpressionNet.loadFromUri(faceauthmodel),
        faceapi.nets.ssdMobilenetv1.loadFromUri(faceauthmodel),
        faceapi.nets.tinyFaceDetector.loadFromUri(faceauthmodel),
        faceapi.nets.ageGenderNet.loadFromUri(faceauthmodel)
    ]).then(() => {
        isModelsLoaded = true
    });
}

function waitToLoadFaceApi() {
    return new Promise((resolve, reject) => {
        let waitToLoadFaceApiInterval = setInterval(() => {
            if (typeof faceapi !== 'undefined') {
                clearInterval(waitToLoadFaceApiInterval);
                resolve();
            }
        }, 100)
    })
}

var aware = {
    reStart: async () => {
        return new Promise(async (resolve, reject) => {
            smileExp = true;
            matchCount = 0;
            maxTimeCount = 0;
            returnObject.isMatch = false;
            returnObject.message = ``;
            returnObject.nextExp = `Show your face for authentication.`;
            startCamera();
            resolve();
        })
    },
    match: () => {
        return new Promise(async (resolve, reject) => {
            console.log("match function");
            const canvasNew = faceapi.createCanvasFromMedia(videoForSFMatch);
            const photo = canvasNew.toDataURL();
            /*console.log("Photo :::::::::::: " + photo);*/
            returnPhoto = canvasNew.toDataURL("image/jpeg", 0.5);
            /*console.log("returnPhoto :::::::::::::::: " + returnPhoto);*/
            returnObject.photo = returnPhoto;
            canvasForSFMatch = faceapi.createCanvasFromMedia(videoForSFMatch);
            canvasForSFMatch.setAttribute('style', 'position: absolute');
            //  videoForSFMatch.parentElement.append(canvasForSFMatch);
            videoForSFMatch.parentElement.setAttribute('style', 'display: flex;');
            displaySizeForSFMatch = { width: videoForSFMatch.offsetWidth, height: videoForSFMatch.offsetHeight }
            faceapi.matchDimensions(canvasNew, displaySizeForSFMatch);

            var detections = await faceapi.detectAllFaces(videoForSFMatch, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptors()
                .withFaceExpressions()
                .withAgeAndGender();
            const resizeDetections = faceapi.resizeResults(detections, displaySizeForSFMatch);
            canvasForSFMatch.getContext('2d').clearRect(0, 0, videoForSFMatch.offsetWidth, videoForSFMatch.offsetHeight);
            faceapi.draw.drawFaceLandmarks(canvasForSFMatch, resizeDetections);

            if (detections.length > 1) {
                returnObject.isMatch = false;
                returnObject.message = `Many faces were detected.`;
            } else {

                var applno = '${userDetailsFA.eNo}';
                if (apiSwitchFlag == "DeepFace") {
                    const results = resizeDetections.map(d => {
                        return faceMatcher.findBestMatch(d.descriptor);
                    });
                    let count = 0;
                    results.forEach((element, i) => {
                        if (element._label != "unknown" && element._distance != 0) {
                            count++;
                            return
                        }
                    })
                    if (count === 0) {
                        const serverResult = await callDeepFaceApi(photo, originalBase64Image);
                        // const serverResult = false;
                        returnObject.isMatch = serverResult;
                        //returnObject.message = serverResult ? `Click on Proceed to validate your credentials` : `Sorry no match detected.`;
                        returnObject.message = serverResult ? `Validation is in process, Please Wait ............` : `Sorry no match detected.`;
                        returnObject.nextExp = serverResult ? `` : returnObject.nextExp;
                    } else {
                        returnObject.isMatch = true;
                        //returnObject.message = `Click on Proceed to validate your credentials`;
                        returnObject.message = `Validation is in process, Please Wait ............`;
                        returnObject.nextExp = ``;
                    }
                }
                else {
                    const serverResult = await callDeepFaceApi(photo, originalBase64Image);
                    console.log("serverResult ::: " + serverResult);
                    var resultCheck = JSON.parse(serverResult);
                    console.log("Server response" + typeof resultCheck + "  " + resultCheck);
                    returnObject.isMatch = resultCheck;
                    if (resultCheck == true || resultCheck == 'true')
                        returnObject.message = `Validation is in process, Please Wait ............`;
                    else
                        returnObject.message = `Sorry no match detected.`;
                    console.log("message :" + returnObject.message);
                    returnObject.nextExp = resultCheck ? `` : returnObject.nextExp;

                }
            }
            resolve(returnObject);
        })
    },
    clearCanvas: () => {
        canvasForSFMatch.getContext('2d').clearRect(0, 0, canvasForSFMatch.offsetWidth, canvasForSFMatch.offsetHeight);
    },
    start: (base64Image, videoId, message, maxTimeParams, distanceThresholdPercentage, pythonServerApiPM, userDetailsFAPM, apiSwitchFlag) => {
        console.log("face-awre ffile " + pythonServerApiPM);
        console.log("face-awre ffile");
        return new Promise((resolve, reject) => {
            videoForSFMatch = document.getElementById(videoId);
            messageToShown = document.getElementById(message);
            canvas = document.getElementById('canvas');
            maxTime = maxTimeParams;
            pythonServerApi = pythonServerApiPM;
            originalBase64Image = base64Image;
            /* console.log("originalBase64Image ::: " + originalBase64Image);*/
            userDetailsFA = userDetailsFAPM;
            apiSwitchFlag = apiSwitchFlag;
            let minPer = 50;
            distanceThreshold = (minPer + (distanceThresholdPercentage / 10));
            // loadModels('./models')

            let waitToLoadModel = setInterval(async () => {
                if (isModelsLoaded) {
                    clearInterval(waitToLoadModel);
                    let labeledFaceDescriptors = await loadLabeledBase64Images(base64Image);
                    faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, +`0.${distanceThreshold}`);
                   // console.log("faceMatcher ::::: " + faceMatcher);
                    startCamera();
                    //videoForSFMatch.style.display = 'block';
                    // renderPrediction();
                }
            }, 10);

            videoForSFMatch.addEventListener('loadeddata', async () => {
                if (!isGenuine) {
                    console.log('Video data loaded');
                    videoWidth = videoForSFMatch.width || 300;
                    videoHeight = videoForSFMatch.height || 300;
                    videoForSFMatch.width = videoWidth;
                    videoForSFMatch.height = videoHeight;

                    canvas = document.getElementById('canvas');
                    canvas.width = videoWidth
                    canvas.height = videoHeight
                    ctx = canvas.getContext('2d');

                    // Load all models and wait for them to finish loading
                    const modelLoadPromises = [
                        blazeface.load(), // Load BlazeFace for face detection
                        tf.loadLayersModel(faceauthMdl + '/model.json'), // Load spoof detection model
                    ];

                    // Wait until all models are loaded
                    const [blazeFaceModel, classifierModel] = await Promise.all(modelLoadPromises);

                    // Assign models after loading
                    model = blazeFaceModel;
                    console.log('face detection model is loaded')
                    classifier = classifierModel;
                    console.log('Spoof detection model is loaded')
                    facemeshModel = await loadFaceLandmarkDetectionModel();

					faceAuthStatus();
					
                    // Start the prediction loop after all models are loaded

                    let isMatched = await matchFaceWithOriginal(videoForSFMatch, originalBase64Image);
                    if (isMatched && checkOriginalimage) {
                        // document.getElementById('message').innerHTML = "Face matched. Please smile...";
                        document.getElementById('message').innerHTML = "Spoof Detection Started. Please Stay still";
                        startSpoofDetection();  // Start with spoof detection first
                    } else if (!isMatched && !checkOriginalimage) {
                        putBacktophotoUpload(document.authentication.llappln.value, document.authentication.rtocode.value);
                        document.getElementById('message').innerHTML = "The quality of uploaded/captured photo of the applicant submitted is not up to mark, Please exit and re-upload photo and try again.";
                        resolve(returnObject);
                    } else {
                        document.getElementById('message').innerHTML = "Other person detected.. Please Exit and try again.";
                        resolve(returnObject);
                    }

                    // document.getElementById('message').innerHTML = "Spoof Detection Started. Please Stay still";
                    // startSpoofDetection();  // Start with spoof detection first
                } else {
                    if (returnObject.isMatch == true) {
                        //messageToShown.innerHTML = 'Click on Proceed to validate your credentials';
                        messageToShown.innerHTML = 'Validation is in process, Please Wait ............';
                        resolve(returnObject);
                    } else {
                        messageToShown.innerHTML = 'Sorry no match detected, please click Exit and try again';
                        resolve(returnObject);
                    }
                }

            });
        })
    },
    checkPhotoResolution: (image) => {
        return new Promise((resolve, reject) => {
            let waitToLoadModel = setInterval(async () => {
                if (isModelsLoaded) {
                    clearInterval(waitToLoadModel);
                    checkPhotoResolution(image).then(result => {
                        resolve(result);
                    });
                }
            }, 100)
        })
    },
    stop: () => {
        stopCamera();
    }
}

const checkPhotoResolution = async (image) => {
    var img = new Image();
    img.src = image;
    try {
        let detections = await faceapi.detectSingleFace(img, new faceapi.SsdMobilenetv1Options())
            .withFaceLandmarks()
            .withFaceDescriptor()
            .withAgeAndGender();
        if (detections) {
            return true;
        } else {
            console.log("Unable to match with SsdMobilenetv1 model.");
            let detectionsFromTiny = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptor()
                .withAgeAndGender();
            if (detectionsFromTiny) {
                return true;
            } else {
                return false;
            }
        }
    } catch (e) {
        return false;
    }
}

function enableButton(button) {
    button.disabled = false;
    button.classList.remove('disabled');
    button.classList.add('enabled');
}

function disableButton(button) {
    button.disabled = true;
    button.classList.remove('enabled');
    button.classList.add('disabled');
}

const loadLabeledBase64Images = (base64Image) => {
    const labelList = [`label_1`];
    return Promise.all(
        labelList.map(async label => {
            const descriptions = [];
            for (let i = 0; i < 1; i++) {
                var img = new Image();
                img.src = base64Image;
                try {
                    let detections = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
                        .withFaceLandmarks()
                        .withFaceDescriptor()
                        .withAgeAndGender();
                    descriptions.push(detections.descriptor);
                } catch (e) {
                    try {
                        console.log("Unable to match with TinyFaceDetector model.");
                        let detections = await faceapi.detectSingleFace(img, new faceapi.SsdMobilenetv1Options())
                            .withFaceLandmarks()
                            .withFaceDescriptor()
                            .withAgeAndGender();
                        descriptions.push(detections.descriptor);
                    } catch (error) {
                        //alert("Your registered photo was not in proper resolution or clarity.");
                        putBacktophotoUpload(document.authentication.llappln.value, document.authentication.rtocode.value);
                        document.getElementById('message').innerHTML = "The quality of uploaded/captured photo of the applicant submitted is not up to mark, Please exit and re-upload photo and try again.";
                    }
                }
            }
            return new faceapi.LabeledFaceDescriptors(label, descriptions);
        })
    )
}

const startCamera = () => {
    // $("#cam").hide();
    navigator.getUserMedia = (navigator.getUserMedia);
    navigator.getUserMedia(
        { video: {} },
        stream => {
            localstream = stream;
            return videoForSFMatch.srcObject = stream;
        }, err => {
            console.error(err);
        }
    )
}

const stopCamera = () => {
    // clearInterval(interval);
    //aware.clearCanvas();
    videoForSFMatch.src = "";
    videoForSFMatch.pause();
    //   localstream.getTracks()[0].stop();
}
function sleep(time) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve()
        }, time);
    })
}

function callDeepFaceApi(image1, image2) {
    return new Promise((resolve, reject) => {
        xhttpSync.onreadystatechange = async function () {
            if (this.readyState === 4 && this.status === 200) {
                //const result = JSON.parse(this.responseText);
                const result = this.responseText;
                console.log("Match through API : ", result);
                resolve(result);
            } else if (this.readyState === 4 && this.status != 200) {
                console.log(this.status);
                console.log("Python API error");
                resolve(false);
            }
        };
        const deepFaceData =
        {
            "img1": image1, "img2": image2
        }
        const aiFaceData =
        {
            "src_image_b64": image1, "target_image_b64": image2
        }

        /*console.log("Image 1");
        console.log(image1);
        console.log("Image 2");
        console.log(image2);*/

        xhttpSync.open("POST", pythonServerApi, true);
        xhttpSync.setRequestHeader("Content-type", "application/json");
        if (apiSwitchFlag == "DeepFace")
            xhttpSync.send(JSON.stringify(deepFaceData));
        else
            try {
                xhttpSync.send(JSON.stringify(aiFaceData));
            }
            catch (err) {
                console.log(err);
            }
    })
}

async function loadFaceLandmarkDetectionModel() {
    return faceLandmarksDetection.load(faceLandmarksDetection.SupportedPackages.mediapipeFacemesh, { maxFaces: 1 });
}

let spoofDetectionInterval; // To store interval ID

const startSpoofDetection = async () => {
    spoofDetectionInterval = setInterval(async () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const predictions = await model.estimateFaces(videoForSFMatch, false);

        // If a face is detected
        if (predictions.length == 1) {
            predictions.forEach(async (prediction) => {
                const videoWidth = videoForSFMatch.videoWidth;
                const videoHeight = videoForSFMatch.videoHeight;

                // Normalize coordinates
                const normalize = (coords, videoSize, canvasSize) => {
                    return coords.map((coord, i) => (coord / videoSize[i]) * canvasSize[i]);
                };

                // Face coordinates based on video resolution
                const start = normalize(prediction.topLeft, [videoWidth, videoHeight], [300, 300]);
                const end = normalize(prediction.bottomRight, [videoWidth, videoHeight], [300, 300]);

                // Get the original face width and height
                const faceWidth = end[0] - start[0];
                const faceHeight = end[1] - start[1];

                // Calculate face area
                const faceArea = faceWidth * faceHeight;
                const videoArea = videoWidth * videoHeight;
                const faceOccupancy = faceArea / videoArea;
                // console.log(faceOccupancy);
                // Use scaling for cropping
                const mid = [(start[0] + end[0]) * 0.5, (start[1] + end[1]) * 0.5];
                const scale = 1.1;
                const sizeNew = Math.max(faceWidth, faceHeight) * scale;
                const startNew = [mid[0] - (sizeNew * 0.5), mid[1] - (sizeNew * 0.5)];

                // Spoof detection based on face size (40% threshold)
                let label = 'Spoof'; // Default to 'Spoof' unless proven otherwise
                if (faceOccupancy >= 0.01 && faceOccupancy <= 0.11) {
                    // If the face occupies 40% or more, proceed with further checks
                    const videoCrop = getImage(videoForSFMatch, sizeNew, startNew);
                    const logits = tf.tidy(() => {
                        return classifier.predict(tf.browser.fromPixels(videoForSFMatch).resizeBilinear([224, 224]).expandDims(0).toFloat().div(255));
                    });

                    const prediction = await logits.array();
                    label = prediction[0][0] < 0.80 ? 'Spoof' : 'Real';
                    //console.log("Spoof Prediction Score: ", prediction[0]);
                    document.getElementById('message').innerHTML = "Spoof detection is under processing";
                } else {
                    if (faceOccupancy > 0.11) {
                        console.log("Face too large, considered Spoof based on size. Occupancy: ");
                        document.getElementById('message').innerHTML = "Face is too close to the camera. Please move back a little.";
                    } else {
                        console.log("Face too small, considered Spoof based on size. Occupancy: ");
                        document.getElementById('message').innerHTML = "Face is too far from the camera. Please move closer.";
                    }
                }

                // Update box color based on label
                if (label === 'Real') {
                    ctx.strokeStyle = "rgba(0, 0, 0, 0)"; // Green for real face
                    realFaceCount++;
                    spoofChecksSinceLastMatch++;
                    if (spoofChecksSinceLastMatch >= 5) {
                        spoofChecksSinceLastMatch = 0;
                        const isMatched = await matchFaceWithOriginal(videoForSFMatch, originalBase64Image);
                        if (!isMatched) {
                            clearInterval(spoofDetectionInterval);
                            document.getElementById('message').innerHTML = "Face mismatch detected during spoof check. Verification failed.";
                            const canvasNew = faceapi.createCanvasFromMedia(videoForSFMatch);
                            returnPhoto = canvasNew.toDataURL("image/jpeg", 0.5);
                            if (document.authentication.llappln.value != null) {
                                insertfeceauth(false, document.authentication.llappln.value, document.authentication.rtocode.value, returnPhoto);
                            }
                            stopCamera();
                            return;
                        }
                    }
                } else {
                    ctx.strokeStyle = "rgba(0, 0, 0, 0)"; // Red for spoof
                    spoofFaceCount++;
                }

                totalChecks++;
                ctx.lineWidth = "4";

                // Draw the original bounding box based on face width and height (not sizeNew)
                ctx.strokeRect(start[0], start[1], faceWidth, faceHeight);

                // Display the label on the bounding box
                ctx.fillStyle = "red";
                const fontSize = "24px sans-serif";
                ctx.font = fontSize;
                ctx.fillRect(start[0], start[1] - 30, 80, 30);
                ctx.fillStyle = "white";
                ctx.fillText(label, start[0], start[1] - 5);

                // Stop the process after 20 checks
                if (totalChecks >= maxSpoofChecks) {
                    if (realFaceCount >= minRealChecks) {
                        // If enough real detections, proceed to smile detection
                        isGenuine = true;
                        ctx.strokeStyle = "rgba(0, 0, 0, 0)";
                        clearInterval(spoofDetectionInterval);
                        console.log("Spoof detection completed.Genuine face detected.");
                        let isMatched = await matchFaceWithOriginal(videoForSFMatch, originalBase64Image);
                        if (isMatched) {
                            document.getElementById('message').innerHTML = "Face matched. Please smile...";
                            document.getElementById('message').innerHTML = "Genuine face detected. Please Stay still, Smile Detection is in process..";
                            startSmileDetection();
                        } else {
                            document.getElementById('message').innerHTML = "Face mismatch after multiple attempts. Verification failed.";
                        }
                        // startSmileDetection();
                    } else {
                        // If less than 15 real detections or more spoofs than real, stop and flag as spoof
                        isGenuine = false;
                        ctx.strokeStyle = "rgba(0, 0, 0, 0)";
                        //clearInterval(spoofDetectionInterval);
                        document.getElementById('message').innerHTML = "Spoof detected. Face verification failed, Please Exit and try again in good lighting condition and maintain proper distance with camera.";
                        console.log("Spoof detected, stopping further process.");
                        const canvasNew = faceapi.createCanvasFromMedia(videoForSFMatch);
                        returnPhoto = canvasNew.toDataURL("image/jpeg", 0.5);
                        /*console.log("returnPhoto :::::::::::::::: " + returnPhoto);*/
                        console.log("applno---" + document.authentication.llappln.value);
                        /*if(document.authentication.llappln.value!=null){
                        insertfeceauth(false,document.authentication.llappln.value,document.authentication.rtocode.value,returnPhoto);
                         }*/
                        clearInterval(spoofDetectionInterval);
                    }
                }
            });
        } else if (predictions.length > 1) {
            console.log("Multiple faces detected.");
            document.getElementById('message').innerHTML = "Multiple faces detected";
        } else {
            console.log("No face detected.");
            document.getElementById('message').innerHTML = "No face detected.";
        }

        // Check if total checks have reached the maximum
        if (totalChecks >= maxSpoofChecks) {
            clearInterval(spoofDetectionInterval);
        }
    }, 500); // Run spoof detection every 500ms
};



// Smile Detection after Spoof Detection
const startSmileDetection = async () => {
    const smileDetectionInterval = setInterval(async () => {
        const detections = await faceapi.detectAllFaces(videoForSFMatch, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions();
        document.getElementById('message').innerHTML = "Smile Detection is in process, Please smile for 5 Secs";
        const displaySize = { width: videoWidth, height: videoHeight };
        const resizedDetections = faceapi.resizeResults(detections, displaySize);

        detections.forEach(async detection => {
            if (detection.expressions.happy > 0.7) { // Adjust threshold as needed
                smileCounter++;
                smilesSinceLastMatch++;
                document.getElementById('message').innerHTML = "No. of times smile detected: " + smileCounter;
                // Check for matching every 2 smiles
                if (smilesSinceLastMatch >= 2) {
                    smilesSinceLastMatch = 0;
                    const isMatched = await matchFaceWithOriginal(videoForSFMatch, originalBase64Image);
                    if (!isMatched) {
                        clearInterval(smileDetectionInterval);
                        document.getElementById('message').innerHTML = "Face mismatch detected during smile check. Verification failed.";
                        const canvasNew = faceapi.createCanvasFromMedia(videoForSFMatch);
                        returnPhoto = canvasNew.toDataURL("image/jpeg", 0.5);
                        if (document.authentication.llappln.value != null) {
                            insertfeceauth(false, document.authentication.llappln.value, document.authentication.rtocode.value, returnPhoto);
                        }
                        stopCamera();
                        return;
                    }
                }
            }
        });

        // Stop smile detection after reaching max count or timeout
        if (smileCounter >= maxSmileCount) {
            clearInterval(smileDetectionInterval);
            console.log("Smile detection completed.");
            let isMatched = await matchFaceWithOriginal(videoForSFMatch, originalBase64Image);
            if (isMatched) {
                document.getElementById('message').innerHTML = "Face matched. Please blink your eyes.";
                document.getElementById('message').innerHTML = "Eye Blink Detection is in process, Please blink your eyes 5 times.";
                startBlinkDetection();
            } else {
                document.getElementById('message').innerHTML = "Face mismatch after multiple attempts. Verification failed.";
            }
            //startBlinkDetection();  // Start eye blink detection after smile detection
        }
    }, 500);
};

// Blink detection should only be called once smile detection is confirmed
const startBlinkDetection = async () => {
    if (blinkCount < 5) {
        if (facemeshModel) {
            const predictions = await facemeshModel.estimateFaces({ input: videoForSFMatch });
            detectBlinkingEyes(predictions);
            // After detecting a blink, perform matching
            if (eyesClosed === 0 && blinkCount > 0) {
                const isMatched = await matchFaceWithOriginal(videoForSFMatch, originalBase64Image);
                if (!isMatched) {
                    document.getElementById('message').innerHTML = "Face mismatch detected during blink check. Verification failed.";
                    const canvasNew = faceapi.createCanvasFromMedia(videoForSFMatch);
                    returnPhoto = canvasNew.toDataURL("image/jpeg", 0.5);
                    if (document.authentication.llappln.value != null) {
                        insertfeceauth(false, document.authentication.llappln.value, document.authentication.rtocode.value, returnPhoto);
                    }
                    stopCamera();
                    return;
                }
            }
        } else {
            console.error('FaceMesh model not loaded yet.');
        }
        requestAnimationFrame(startBlinkDetection); // Continue checking for blinks
    } else {
        document.getElementById('message').innerText = "Eye blink process is finished.";
        window.cancelAnimationFrame(startBlinkDetection); // Stop animation after blink count is met
        console.log('blinkCount---' + blinkCount + '---smileCounter---' + smileCounter + '---' + isGenuine);
        if (blinkCount >= 5 && smileCounter >= 5 && isGenuine) {
            let MatchInterval = setInterval(async () => {
                while (true) {
                    clearInterval(MatchInterval);
                    if (maxTimeCount === 0)
                        document.getElementById('message').innerHTML = "Please Stay still, Face Authentication is in process..";
                    let result = await aware.match();
                  //  console.log(result.isMatch + "  " + result.message);
                    if (result.message === 'Sorry no match detected.') {
                        maxTimeCount++;
                        messageToShown.innerHTML = 'Sorry no match detected, please wait.....';
                        if (maxTimeCount === maxTime) {
                            messageToShown.innerHTML = 'Sorry no match detected, please click Exit and try again';
                            stopCamera();
                            const canvasNew = faceapi.createCanvasFromMedia(videoForSFMatch);
                            returnPhoto = canvasNew.toDataURL("image/jpeg", 0.5);
                            /*console.log("returnPhoto :::::::::::::::: " + returnPhoto);*/
                            console.log("applno---" + document.authentication.llappln.value);
                            if (document.authentication.llappln.value != null) {
                                insertfeceauth(false, document.authentication.llappln.value, document.authentication.rtocode.value, returnPhoto);
                            }
                            resolve({ isMatch: result.isMatch, photo: result.photo });
                            break;
                        }
                    } else if (result.isMatch) {
                        messageToShown.innerHTML = `${result.message} ${result.nextExp}`;
                        stopCamera();
                        resolve({ isMatch: result.isMatch, photo: result.photo });
                        break;
                    } else {
                        messageToShown.innerHTML = `${result.message} ${result.nextExp}`;
                    }
                    await sleep(2000);
                }
            }, 1000);
        }
    }
};

// Call this function to detect blinking eyes and update blink count
const detectBlinkingEyes = (predictions) => {
    predictions.forEach(prediction => {
        const keypoints = prediction.keypoints;

        // Get key points for eyes
        const rightEyeUpper0 = prediction.annotations.rightEyeUpper0;
        const rightEyeLower0 = prediction.annotations.rightEyeLower0;
        const leftEyeUpper0 = prediction.annotations.leftEyeUpper0;
        const leftEyeLower0 = prediction.annotations.leftEyeLower0;

        // Calculate distances for eye closure
        const eyeOutlinePoints = rightEyeUpper0.concat(rightEyeLower0, leftEyeUpper0, leftEyeLower0);
        let rightEyeCenterPointDistance = Math.abs(rightEyeUpper0[3][1] - rightEyeLower0[4][1]);
        let leftEyeCenterPointDistance = Math.abs(leftEyeUpper0[3][1] - leftEyeLower0[4][1]);

        // Check if eyes are closed
        if (rightEyeCenterPointDistance < 7 || leftEyeCenterPointDistance < 7) {
            eyesClosed = 1;
        }
        if (eyesClosed === 1 && (rightEyeCenterPointDistance > 9 || leftEyeCenterPointDistance > 9)) {
            blinkCount++;
            document.getElementById('message').innerHTML = "No. of times blinked: " + blinkCount;
            eyesClosed = 0; // Reset after a blink is detected
        }
    });
};

// Utility function to extract image from video
const getImage = (videoForSFMatch, sizeImg, startImg) => {
    const canvasTemp = document.createElement('canvas');
    canvasTemp.height = sizeImg;
    canvasTemp.width = sizeImg;
    const ctxTemp = canvasTemp.getContext("2d");
    ctxTemp.clearRect(0, 0, sizeImg, sizeImg);
    ctxTemp.drawImage(videoForSFMatch, startImg[0], startImg[1], sizeImg, sizeImg, 0, 0, sizeImg, sizeImg);
    return canvasTemp;
};


function insertfeceauth(faceresult, llappln, rtocode, result_photo) {
    // newImage.src = result.photo;
    //alert("error"+faceresult);
    /*console.log("result.photo :::::::::::::::::::::::::"+result_photo);*/
   // console.log("result.isMatch :::::::::::::::::::::::::" + faceresult + llappln + rtocode);

    var link = 'saveFaceAuthData.do';

    if (faceresult == true || faceresult == "true") {
        try {
            $("#capphto1").attr('disabled', false);
            $("#capphto").attr('disabled', true);
            $("#llappln").attr('disabled', true);
            $("#pwd").attr('disabled', true);

            $.ajax({
                type: 'POST',
                url: link,
                data: {
                    applno: llappln,
                    rtocode: rtocode,
                    faceres: 1,
                    CapPho: result_photo
                },
                dataType: 'json',
                success: function (data) { },
                error: function () {
                    //alert(error1);
                }
            });
        } catch (err) {
            //alert("error");
        }

    } else {
        try {
            $("#capphto1").attr('disabled', true);
            $("#capphto").attr('disabled', false);

            $.ajax({
                type: 'POST',
                url: link,
                data: {
                    applno: llappln,
                    rtocode: rtocode,
                    faceres: 0,
                    CapPho: result_photo
                },
                dataType: 'json',
                success: function (data) { },
                error: function () {
                    //alert("error");
                }
            });
        } catch (err) {
            //alert("error");
        }
        //$("input[type=submit]").prop("disabled",false);
        //document.getElementById('capphto').style.display="none";
    }
}

async function matchFaceWithOriginal(videoFrame, originalBase64Image) {
    const canvasTemp = faceapi.createCanvasFromMedia(videoFrame);
    const capturedPhoto = canvasTemp.toDataURL("image/jpeg", 0.5);
    let matchAttempts = 0;
    let isMatched = false;

    while (matchAttempts < 5) {
        let detections = await faceapi.detectSingleFace(videoFrame, new faceapi.SsdMobilenetv1Options())
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!detections) {
            console.log("No face detected for matching.");
        } else {
            // Load the base64 image
            let originalImg = new Image();
            originalImg.src = originalBase64Image;
            await new Promise(resolve => originalImg.onload = resolve);

            // Draw the base64 image onto a temporary canvas
            const originalCanvas = document.createElement('canvas');
            originalCanvas.width = originalImg.width;
            originalCanvas.height = originalImg.height;
            const ctx = originalCanvas.getContext('2d');
            ctx.drawImage(originalImg, 0, 0);

            // Now detect the face on the canvas, not directly on the Image
            let originalDetections = await faceapi.detectSingleFace(originalCanvas, new faceapi.SsdMobilenetv1Options())
                .withFaceLandmarks()
                .withFaceDescriptor();


            if (!originalDetections) {
                console.log("No face detected in the original image.");
                checkOriginalimage = false;
            } else {
                const distance = faceapi.euclideanDistance(detections.descriptor, originalDetections.descriptor);
               // console.log("Matching attempt", matchAttempts + 1, "distance:", distance);
                if (distance < 0.6) {
                    isMatched = true;
                    break;
                }
            }
        }
        matchAttempts++;
    }
    return isMatched;
}

async function faceAuthStatus() {
    console.log("in faceAuthStatus");
    const faceAuthString = document.authentication.llappln.value+document.authentication.entcaptxt.value;
    console.log("in faceAuthString" + faceAuthString);
    const faceAuthStatus = await hashSHA256(faceAuthString);
    console.log("in faceAuthStatus" + faceAuthStatus);
    var link = 'faceAuthStatus.do';
    try {
        $.ajax({
            type: 'POST',
            url: link,
            data: {
                faceAuthStatus: faceAuthStatus
            },
            dataType: 'json',
            success: function (data) { },
            error: function () {
                //alert(error1);
            }
        });
    } catch (err) {
        //alert("error");
    }
}
async function hashSHA256(faceAuthString) {
	const encoder = new TextEncoder();
	const data = encoder.encode(faceAuthString);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);

	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const hashHex = hashArray.map(byte => {return byte.toString(16).padStart(2, '0');}).join('');
	return hashHex;
}
 
function putBacktophotoUpload(llappln, rtocode) {
    console.log("in putBacktophotoUpload" + llappln);
    var link = 'putBacktophotoUpload.do';
    try {
		$("#capphto1").attr('disabled',true);
		$("#capphto").attr('disabled',true);
        $.ajax({
            type: 'POST',
            url: link,
            data: {
                applno: llappln,
                rtocode: rtocode
            },
            dataType: 'json',
            success: function (data) { },
            error: function () {
                //alert(error1);
            }
        });
    } catch (err) {
        //alert("error");
    }
}

