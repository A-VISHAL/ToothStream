class AudioChunkProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.chunkSize = 4096;
    this.buffer = [];
    this.bufferLength = 0;
  }

  process(inputs) {
    const input = inputs[0] && inputs[0][0];

    if (!input) {
      return true;
    }

    this.buffer.push(new Float32Array(input));
    this.bufferLength += input.length;

    if (this.bufferLength >= this.chunkSize) {
      const chunk = new Float32Array(this.bufferLength);
      let offset = 0;

      for (const part of this.buffer) {
        chunk.set(part, offset);
        offset += part.length;
      }

      this.port.postMessage(chunk, [chunk.buffer]);
      this.buffer = [];
      this.bufferLength = 0;
    }

    return true;
  }
}

registerProcessor('audio-chunk-processor', AudioChunkProcessor);
