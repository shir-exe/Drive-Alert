# Browser-based concentration model

The application currently uses `v4_66.onnx`; `v4_2.onnx` is retained as the other instructor-provided model for comparison. Both take a temporal sequence shaped `[1, 100, 478, 3]` (100 face-landmark frames, each with 478 XYZ points) and expose `regression_scores`, `classification_logits`, and `attention_weights`. The application uses the selected model's `regression_scores` output as its continuous 0-1 HUD value; it does not infer meanings for the five classification logits because no class-label mapping was supplied. The models have not been compared against labeled webcam examples, so selecting `v4_66` is an experiment, not evidence that it is more accurate.

MediaPipe FaceLandmarker runs in the browser and supplies XYZ face landmarks to ONNX Runtime Web. The first score appears after collecting 100 frames; inference then runs on a rolling window. If either model cannot load or inference fails, the UI reports an error instead of fabricating a score. If no face is detected for 750 ms, the score is set to zero and the no-face alert is raised. The configured drive alert threshold is 0.40.

The webcam video is processed locally and is not uploaded by the monitoring hooks. MediaPipe's task bundle and face-landmarker asset load from their upstream public CDNs.
