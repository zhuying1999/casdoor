// Copyright 2024 The Casdoor Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as faceapi from "face-api.js";
import React, {useState} from "react";
import Webcam from "react-webcam";
import {Button, Modal, Progress, Spin, message} from "antd";
import i18next from "i18next";

const FaceRecognitionModal = (props) => {
  const {visible, onOk, onCancel} = props;
  const [modelsLoaded, setModelsLoaded] = React.useState(false);

  const webcamRef = React.useRef();
  const canvasRef = React.useRef();
  const detection = React.useRef(null);
  const [percent, setPercent] = useState(0);

  React.useEffect(() => {
    const loadModels = async() => {
      // const MODEL_URL = process.env.PUBLIC_URL + "/models";
      // const MODEL_URL = "https://justadudewhohacks.github.io/face-api.js/models";
      // const MODEL_URL = "https://cdn.casbin.org/site/casdoor/models";
      const MODEL_URL = "https://cdn.casdoor.com/casdoor/models";

      Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]).then((val) => {
        setModelsLoaded(true);
      }).catch((err) => {
        message.error(i18next.t("login:Model loading failure"));
        onCancel();
      });
    };
    loadModels();
  }, []);

  React.useEffect(() => {
    if (visible) {
      setPercent(0);
      if (modelsLoaded && webcamRef.current?.video) {
        handleStreamVideo(null);
      }
    } else {
      clearInterval(detection.current);
      detection.current = null;
    }
    return () => {
      clearInterval(detection.current);
      detection.current = null;
    };
  }, [visible]);

  const handleStreamVideo = (e) => {
    let count = 0;
    let goodCount = 0;
    if (!detection.current) {
      detection.current = setInterval(async() => {
        if (modelsLoaded && webcamRef.current?.video && visible) {
          const faces = await faceapi.detectAllFaces(webcamRef.current.video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptors();

          count++;
          if (count % 50 === 0) {
            message.warning(i18next.t("login:Please ensure sufficient lighting and align your face in the center of the recognition box"));
          } else if (count > 300) {
            message.error(i18next.t("login:Face recognition failed"));
            onCancel();
          }
          if (faces.length === 1) {
            const face = faces[0];
            setPercent(Math.round(face.detection.score * 100));
            const array = Array.from(face.descriptor);
            if (face.detection.score > 0.9) {
              goodCount++;
              if (face.detection.score > 0.99 || goodCount > 10) {
                clearInterval(detection.current);
                onOk(array);
              }
            }
          } else {
            setPercent(Math.round(percent / 2));
          }
        }
      }, 100);
    }
  };

  const handleCameraError = (error) => {
    // https://github.com/mozmorris/react-webcam/issues/272
    if (error.message.includes("device not found")) {
      message.error(i18next.t("login:You need to have a camera device to login with Face ID"));
    } else {
      message.error(error.message);
    }
  };

  return (
    <div>
      <Modal
        closable={false}
        maskClosable={false}
        open={visible}
        title={i18next.t("login:Face Recognition")}
        width={350}
        footer={[
          <Button key="back" onClick={onCancel}>
            Cancel
          </Button>,
        ]}
      >
        <Progress percent={percent} />
        <div style={{marginTop: "20px", marginBottom: "50px", justifyContent: "center", alignContent: "center", position: "relative", flexDirection: "column"}}>
          {
            modelsLoaded ?
              <div style={{display: "flex", justifyContent: "center", alignContent: "center"}}>
                <Webcam
                  ref={webcamRef}
                  videoConstraints={{facingMode: "user"}}
                  onUserMedia={handleStreamVideo}
                  onUserMediaError={handleCameraError}
                  style={{
                    borderRadius: "50%",
                    height: "220px",
                    verticalAlign: "middle",
                    width: "220px",
                    objectFit: "cover",
                  }}
                ></Webcam>
                <div style={{
                  position: "absolute",
                  width: "240px",
                  height: "240px",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                }}>
                  <svg width="240" height="240" fill="none">
                    <circle
                      strokeDasharray="700"
                      strokeDashoffset={700 - 6.9115 * percent}
                      strokeWidth="4"
                      cx="120"
                      cy="120"
                      r="110"
                      stroke="#5734d3"
                      transform="rotate(-90, 120, 120)"
                      strokeLinecap="round"
                      style={{transition: "all .2s linear"}}
                    ></circle>
                  </svg>
                </div>
                <canvas ref={canvasRef} style={{position: "absolute"}} />
              </div>
              :
              <div>
                <Spin tip={i18next.t("login:Loading")} size="large" style={{display: "flex", justifyContent: "center", alignContent: "center"}}>
                  <div className="content" />
                </Spin>
              </div>
          }
        </div>
      </Modal>
    </div>
  );
};

export default FaceRecognitionModal;
