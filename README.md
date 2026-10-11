<h1 align="center">WallFluxer AI API</h1>

<p align="center">
  <b>The local image engine behind WallFluxer.</b><br/>
  A Python FastAPI service that turns one sentence into a 4K wallpaper, fully on your own GPU.
</p>

<p align="center">
  <img alt="Python" src="https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=white" />
  <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white" />
  <img alt="PyTorch" src="https://img.shields.io/badge/Stable%20Diffusion-1.5-7c83ff" />
  <img alt="Runs locally" src="https://img.shields.io/badge/Runs-100%25%20locally-7c83ff" />
  <a href="https://www.linkedin.com/in/sidharthan-jayavelu/"><img alt="LinkedIn" src="https://img.shields.io/badge/LinkedIn-Sidharthan%20Jayavelu-0A66C2?logo=linkedin&logoColor=white" /></a>
</p>

> This is the backend of **WallFluxer**, an Electron + React desktop app. The desktop app starts this service in the background, talks to it over localhost, and shuts it down when you close the window.

---

## 🔄 Workflow

```mermaid
flowchart TD
    subgraph CLIENT["🖥️ WallFluxer desktop app (Electron + React)"]
        A["User types one sentence<br/>+ picks style, theme, composition"]
        Z["Wallpaper shown in<br/>My Wallpapers gallery"]
    end

    subgraph API["⚙️ WallFluxer AI API (FastAPI, localhost)"]
        B["Receive request"]
        C["Prompt builder<br/>idea + preset tags + negative prompt"]
        D["Load Stable Diffusion 1.5 model<br/>from the models folder"]
        E["Base generation<br/>512-class image"]
        F["Hires fix<br/>img2img refine, adds real detail"]
        G["Real-ESRGAN upscaler<br/>up to 4K and beyond"]
        H["Save image + metadata<br/>to the data folder and database"]
    end

    A -- "HTTP request" --> B
    B --> C --> D --> E --> F --> G --> H
    H -- "JSON response" --> Z

    style CLIENT fill:#1f2937,stroke:#7c83ff,color:#ffffff
    style API fill:#111827,stroke:#76B900,color:#ffffff
    style G fill:#76B900,stroke:#76B900,color:#000000
    style E fill:#7c83ff,stroke:#7c83ff,color:#000000
```

**In short:** idea → prompt → base image → hires fix → AI upscale → saved wallpaper.

---

## 🧩 Tech

- **Python** and **FastAPI** for the local API
- **Stable Diffusion 1.5** (`.safetensors` models, bring your own or use the bundled one)
- **Real-ESRGAN** for upscaling
- **PyInstaller** to package everything into a single backend executable

---

## 📦 Models and data

Model files are **not** stored in this repo because they are several GB. The desktop app ships with a base model, and users can add their own.

```
models/    Stable Diffusion models and the upscaler (not in git)
data/      generated wallpapers and the local database (created on first run)
```

---

## ⚠️ Content warning

This service only runs models. I did not train or own any of them. Models can produce NSFW or mature content depending on the prompt and the model, and what you generate is your responsibility. Each model keeps its own license.

---

## 🙏 Credits

- **[DreamShaper 8](https://civitai.com/models/4384/dreamshaper)** by Lykon
- **[Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN)**
- **[Stable Diffusion](https://github.com/CompVis/stable-diffusion)** by CompVis, Stability AI and Runway

---

## 📬 Contact

Built by **Sidharthan Jayavelu**. Reach me on [LinkedIn](https://www.linkedin.com/in/sidharthan-jayavelu/).