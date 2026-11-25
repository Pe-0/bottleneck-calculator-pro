/* ============================================================
 * SOFTWARE DEMAND DATA — professional/workload software profiles
 * Layer: benchmarks.software. Logically separate.
 * Curated from vendor system requirements and common workstation
 * guidance; scores are relative component-importance weights,
 * not measurements. confidence: medium.
 * ============================================================ */

window.BCP = window.BCP || {};

window.BCP.software = {
  meta: {
    layer: "benchmarks.software",
    asOf: "2025-Q3",
    confidence: "medium (vendor requirements + curated workstation guidance)",
    source: "Vendor system requirement pages (Adobe, Autodesk, Blender, Blackmagic, OBS, Microsoft)"
  },
  items: [
    { id: "sw-blender",   name: "Blender (3D rendering)",   category: "3D / Rendering",  cpuImp: 0.9, gpuImp: 0.9, ramGB: 32,
      note: "Cycles renders on GPU (CUDA/OptiX preferred) or CPU; viewport likes fast single-core. Scales to all cores." },
    { id: "sw-premiere",  name: "Adobe Premiere Pro",        category: "Video editing",   cpuImp: 0.8, gpuImp: 0.6, ramGB: 32,
      note: "Timeline playback is CPU + codec bound; GPU accelerates effects and export (NVENC helps)." },
    { id: "sw-resolve",   name: "DaVinci Resolve",           category: "Video editing",   cpuImp: 0.6, gpuImp: 1.0, ramGB: 32,
      note: "Color grading and Fusion are heavily GPU bound; 12 GB+ VRAM recommended for 4K timelines." },
    { id: "sw-autocad",   name: "AutoCAD / Revit",           category: "CAD",             cpuImp: 0.9, gpuImp: 0.4, ramGB: 32,
      note: "Mostly single-thread CPU bound; a mid-range GPU is enough unless you do 3D visualization." },
    { id: "sw-dev",       name: "Software development",      category: "Programming",     cpuImp: 0.8, gpuImp: 0.1, ramGB: 32,
      note: "Compiles and test suites scale with core count; RAM matters for IDEs, containers and browsers. GPU rarely matters." },
    { id: "sw-obs",       name: "OBS Studio (streaming)",    category: "Streaming",       cpuImp: 0.7, gpuImp: 0.5, ramGB: 16,
      note: "x264 encoding eats CPU cores; NVENC/AMF offload encoding to the GPU with minimal FPS cost." },
    { id: "sw-vm",        name: "Virtual machines / Docker", category: "Virtualization",  cpuImp: 0.8, gpuImp: 0.1, ramGB: 64,
      note: "RAM is the wall: 8-16 GB per active VM. Core count decides how many VMs run well at once." },
    { id: "sw-llm",       name: "Local AI / LLM inference",  category: "AI workloads",    cpuImp: 0.4, gpuImp: 1.0, ramGB: 32,
      note: "VRAM is everything - model size must fit (12 GB for small 7-8B quantized, 24 GB for larger). Fast storage helps load times." },
    { id: "sw-ps",        name: "Photoshop / Lightroom",     category: "Photo editing",   cpuImp: 0.7, gpuImp: 0.4, ramGB: 32,
      note: "Fast single-core CPU + lots of RAM for big catalogs; GPU accelerates specific filters." },
    { id: "sw-excel",     name: "Heavy spreadsheets / data", category: "Office / data",   cpuImp: 0.7, gpuImp: 0.0, ramGB: 32,
      note: "Single-core speed and RAM capacity dominate; any modern GPU is fine." }
  ]
};
