const video = document.getElementById("videoInput");
let delaytime = 0;

Promise.all([
  faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
  faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
  faceapi.nets.ssdMobilenetv1.loadFromUri("/models"), //heavier/accurate version of tiny face detector
]).then(start);

function start() {
  document.body.append("Models Loaded");

  // navigator.getUserMedia(
  //   { video: {} },
  //   (stream) => (video.srcObject = stream),
  //   (err) => console.error(err)
  // );

  video.src = "../videos/speech.mp4";
  console.log("video added");
  recognizeFaces();
}

let dataToAppend = "";

function generateReport(content) {
  // var element = document.createElement("a");
  // var file = new Blob([content], { type: "text/plain" });
  // element.href = URL.createObjectURL(file);
  // element.download = "report.txt";
  // element.click();
  dataToAppend += content;
  const fileName = "report.txt";
  const downloadDelay = 50000; // delay in milliseconds

  const blob = new Blob([dataToAppend], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.download = fileName;
  link.href = url;
  document.body.appendChild(link);

  setTimeout(() => {
    link.click();
  }, downloadDelay);
}

async function toShowAlert(result) {
  var currentdate = new Date();
  var datetime =
    "Last Seen at: " +
    currentdate.getDate() +
    "/" +
    (currentdate.getMonth() + 1) +
    "/" +
    currentdate.getFullYear() +
    " @ " +
    currentdate.getHours() +
    ":" +
    currentdate.getMinutes() +
    ":" +
    currentdate.getSeconds();
  // setTimeout(function () {
  //   alert(result.toString() + datetime);
  // }, 1000);
  var content = result.toString() + datetime + "\n";
  let permission = await Notification.requestPermission();
  if (permission == "granted") {
    const noti = new Notification(content);
    setTimeout(() => noti.close(), 10 * 1000);
  }
  generateReport(content);
  var audio = new Audio("../js/alert.mp3");
  audio.play();
}

async function recognizeFaces() {
  const labeledDescriptors = await loadLabeledImages();
  console.log(labeledDescriptors);
  const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);

  video.addEventListener("play", async () => {
    console.log("Playing");
    const canvas = faceapi.createCanvasFromMedia(video);
    document.body.append(canvas);

    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
      const detections = await faceapi
        .detectAllFaces(video)
        .withFaceLandmarks()
        .withFaceDescriptors();

      const resizedDetections = faceapi.resizeResults(detections, displaySize);

      canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

      const results = resizedDetections.map((d) => {
        return faceMatcher.findBestMatch(d.descriptor);
      });
      results.forEach((result, i) => {
        const box = resizedDetections[i].detection.box;
        const drawBox = new faceapi.draw.DrawBox(box, {
          label: result.toString(),
        });
        drawBox.draw(canvas);
        // alert(result.toString())
        delaytime += 1;
        // console.log(delaytime);
        if (delaytime == 10) {
          toShowAlert(result);
          delaytime = 0;
        }
      });
    }, 100);
  });
}

function loadLabeledImages() {
  const labels = [
    "Black Widow",
    "Captain America",
    "Hawkeye",
    "Jim Rhodes",
    "Tony Stark",
    "Thor",
    "Captain Marvel",
  ];
  // const labels = ["Shubham Ashish", "Shrushti", "Shashank"]; // for WebCam
  return Promise.all(
    labels.map(async (label) => {
      const descriptions = [];
      for (let i = 1; i <= 2; i++) {
        const img = await faceapi.fetchImage(
          `../labeled_images/${label}/${i}.jpg`
        );
        const detections = await faceapi
          .detectSingleFace(img)
          .withFaceLandmarks()
          .withFaceDescriptor();
        console.log(label + i + JSON.stringify(detections));
        descriptions.push(detections.descriptor);
      }
      document.body.append(label + " Faces Loaded | ");
      return new faceapi.LabeledFaceDescriptors(label, descriptions);
    })
  );
}
