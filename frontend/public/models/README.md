# Browser-based concentration model

`v4_2.onnx` is the ONNX model supplied for the project. It takes a temporal sequence shaped `[1, 100, 478, 3]` (100 face-landmark frames, each with 478 XYZ points) and exposes `regression_scores`, `classification_logits`, and `attention_weights`. The application uses the model's `regression_scores` output as its continuous 0-1 HUD value; it does not infer meanings for the five classification logits because no class-label mapping was supplied.

MediaPipe FaceLandmarker runs in the browser and supplies XYZ face landmarks to ONNX Runtime Web. The first score appears after collecting 100 frames; inference then runs on a rolling window. If either model cannot load or inference fails, the UI reports an error instead of fabricating a score. If no face is detected for 750 ms, the score is set to zero and the no-face alert is raised. The configured drive alert threshold is 0.40.

The webcam video is processed locally and is not uploaded by the monitoring hooks. MediaPipe's task bundle and face-landmarker asset load from their upstream public CDNs.
