# Volunteer Management System (VMS) — Blazor WebAssembly PWA

The **Volunteer Management System (VMS)** is a Blazor WebAssembly Progressive Web App (PWA) built with .NET 8 and MudBlazor.  
It is designed to work offline-first with a service worker, provide responsive performance across desktop and mobile, and support future real-time features (like SignalR).

---

## 🚀 Features

- Blazor WebAssembly (standalone, offline-capable)
- MudBlazor UI components
- Custom Service Worker (`service-worker.js`)
- Fully functional PWA (installable on desktop and mobile)
- Optimized for performance (LCP < 2s on Release)
- Optional AOT (Ahead-of-Time) compilation for faster runtime
- Compatible with Android and iOS (tested via Safari & Chrome)

---

## 🧰 Requirements

Before building or running VMS locally, make sure your environment has the following:

### Prerequisites

| Tool | Version | Purpose |
|------|----------|----------|
| **.NET SDK** | 8.0.414 or newer | Build, run, and publish Blazor WASM apps |
| **Node.js** | 18.x or newer | Needed for `npx serve` and `ngrok` |
| **npm** | 9.x or newer | Used for lightweight dev hosting |
| **Visual Studio 2022** | (optional) | For full IDE experience |
| **wasm-tools workload** | (install via `dotnet workload install wasm-tools`) | Enables AOT compilation |

---

## ⚙️ Setup Instructions

### 1. Clone the repository and navigate into it

```bash
git clone https://github.com/lizbethhahn/VMS-PWA.git
```

### 2. Restore dependencies

```bash
dotnet restore
```

### 3. Build and run (Debug)

```bash
dotnet build
dotnet run
```

This starts the local development server (default `http://localhost:7118`).


---

## 🧩 Packages Used

| Package | Version | Description |
|----------|----------|-------------|
| `Microsoft.AspNetCore.Components.WebAssembly` | 8.0.21 | Core Blazor WASM runtime |
| `Microsoft.AspNetCore.Components.WebAssembly.DevServer` | 8.0.21 | Local debugging & dev hosting |
| `MudBlazor` | 8.11.0 | UI component framework |

---

## 📦 Build for Release

### Regular Release (Trimmed)

```bash
dotnet publish -c Release
```

### AOT (Ahead-of-Time) Build (optional)

```bash
dotnet publish -c Release -p:RunAOTCompilation=true
```

> ⚠️ Takes longer to build, but runs faster on clients.

---

## 🌍 Testing Locally

### Serve the published output

```bash
cd bin/Release/net8.0/publish/wwwroot
npx serve -l 5123
```

### Test on your phone (same Wi-Fi)

1. Find your IP address:
   ```bash
   ipconfig
   ```
2. On your phone, go to:
   ```
   http://<your-ip>:5123
   ```

**Android:** Install prompt appears automatically.  
**iPhone:** Use Safari → Share → Add to Home Screen.

---

## 🧱 PWA Notes

- The service worker (`service-worker.js`) handles caching for offline use.
- Cache versioning is controlled by `CACHE_NAME` in the file (e.g., `vms-cache-v11`).
- When updating assets, **bump the cache version** to ensure users get fresh files.

---

## 📱 Testing Offline

1. Open DevTools → Application → Service Workers.
2. Confirm `[SW] Boot v11` and `[SW] Active` appear in the Console.
3. Go **Offline** and reload — the app should still load and work.

---

## 🧰 Optional Tools

| Tool | Use Case |
|------|-----------|
| `ngrok` | HTTPS tunnel for mobile testing |
| `mkcert` | Create local HTTPS certificates |
| `Netlify Drop` | Quick deploy for iPhone testing over HTTPS |

---

## 🧭 Troubleshooting

| Symptom | Likely Cause | Fix |
|----------|---------------|-----|
| 404 on `.map` files | Source maps omitted in Release | Ignore |
| 404 on `manifest.webmanifest` | Not copied to publish output | Add `<Content Include>` rule |
| App not styled | Missing `VMS.styles.css` or `_content/MudBlazor/MudBlazor.min.css` | Clean + rebuild |
| Old SW still active | Cached version | Unregister + Clear site data + Reload |

---

## 🧑‍💻 License

MIT License — feel free to use, modify, or fork this project.

---