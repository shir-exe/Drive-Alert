# Browser-based alertness estimate

`v4_2.onnx` is a 145-byte `ReduceMean` placeholder, not an attention classifier, and is intentionally not loaded.

Both monitoring screens use the MediaPipe FaceLandmarker task with face blendshape output enabled. The trained task estimates `eyeBlinkLeft` and `eyeBlinkRight`; the app converts those estimates into a rolling 30-second eye-closure ratio (PERCLOS-style) and an alertness proxy (`1 - PERCLOS / 0.20`, clamped to 0-1). Scores become available after a short warm-up. The drive alert threshold is 0.40. A continuous eye closure for 1.5 seconds also triggers an immediate warning. Camera frames remain in the browser.

This is an eye-closure-based fatigue indicator, not a model that directly measures concentration, gaze direction, or driving fitness. Its thresholds are heuristics and have not been clinically or operationally validated. Do not rely on it as a safety-certified driver-monitoring system.

The MediaPipe task bundle and face-landmarker model are loaded from their upstream public CDNs when the feature initializes.
