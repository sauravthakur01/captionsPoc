# Live Captions Demo - Web Speech API POC

A Proof of Concept (POC) application demonstrating real-time speech-to-text captioning using the Web Speech API. This application captures audio from the user's microphone and displays live transcriptions with support for 100+ languages.

## 🎯 Project Overview

This is a browser-based live captioning system that provides:

- Real-time speech recognition and transcription
- Multi-language support (100+ language variants)
- Continuous listening with auto-restart capability
- Visual display of both interim (in-progress) and final captions
- Downloadable transcript history
- Error handling and recovery mechanisms

## ✨ Features

### Core Functionality

- **Real-time Speech Recognition**: Continuous audio capture and transcription
- **Interim Results**: Shows real-time transcription as you speak (before finalization)
- **Final Results**: Displays confirmed, finalized transcription text
- **Multi-language Support**: 100+ languages including English, Spanish, French, German, Arabic, Chinese, Hindi, and many more
- **Auto-restart**: Automatic recovery from interruptions or errors
- **Transcript History**: Running list of all captured captions
- **Export Capability**: Download full transcript with timestamps and language metadata

### User Experience

- **Dark Theme UI**: Modern, eye-friendly interface
- **Responsive Design**: Works on desktop and mobile browsers
- **Visual Feedback**: Clear status indicators (Idle, Listening, Restarting, Stopped)
- **Error Messages**: User-friendly error notifications
- **Microphone Permissions**: Explicit audio permission handling with enhanced settings (echo cancellation, noise suppression, auto gain control)

## 🚀 Getting Started

### Prerequisites

- A modern Chromium-based browser (Chrome, Edge, Brave, Opera)
- Microphone access
- Local web server (for proper API permissions)

### Installation

1. **Clone or download this repository**

   ```bash
   git clone <repository-url>
   cd WebKit-POC
   ```

2. **Start a local web server**

   Using Python:

   ```bash
   python3 -m http.server 5500
   ```

   Or using Node.js (http-server):

   ```bash
   npx http-server -p 5500
   ```

3. **Open in browser**
   ```
   http://localhost:5500
   ```

### Quick Start Usage

1. **Select Language**: Choose your preferred language from the dropdown menu
2. **Start Captions**: Click "Start captions" button
3. **Grant Permissions**: Allow microphone access when prompted
4. **Speak**: Begin speaking - captions will appear in real-time
5. **Stop**: Click "Stop" button to end the session
6. **Download**: Click "Download transcript" to save your session

## 📁 Project Structure

```
WebKit-POC/
├── index.html      # Main HTML structure and UI elements
├── styles.css      # Styling and visual design
├── app.js          # Core application logic and Web Speech API integration
└── README.md       # This documentation file
```

## 🔧 Technical Architecture

### File Breakdown

#### `index.html`

**Purpose**: Defines the structure and layout of the application

**Key Components**:

- **Header**: Title and support notice area
- **Controls Section**: Language selector, start/stop buttons, auto-restart toggle, download button
- **Stage Section**: Large display area for live captions (final + interim)
- **Status Bar**: Current state and error messages
- **Transcript Section**: Historical list of all captured phrases
- **Footer**: Browser compatibility notice

**Notable Elements**:

- `#language`: Select dropdown with 100+ language options
- `#startBtn` / `#stopBtn`: Control buttons for caption session
- `#autoRestart`: Checkbox for automatic restart feature
- `#downloadBtn`: Downloads transcript as text file
- `#finalLine`: Displays finalized captions (large, bold)
- `#interimLine`: Displays in-progress captions (smaller, muted)
- `#transcriptList`: Ordered list of all final transcripts

#### `styles.css`

**Purpose**: Provides modern, dark-themed styling

**Design System**:

- **Color Palette**:
  - Background: `#0f1115` (dark blue-gray)
  - Panel: `#151821` (slightly lighter)
  - Text: `#e8eaed` (off-white)
  - Muted: `#9aa0a6` (gray)
  - Accent: `#4dabf7` (blue)
  - Danger: `#ef4444` (red for errors)

**Key Features**:

- Responsive design with `clamp()` for fluid typography
- Custom toggle switch implementation
- Fixed-position caption display at bottom center
- Gradient header for visual appeal
- System font stack for optimal rendering

#### `app.js`

**Purpose**: Core application logic and Web Speech API integration

**Architecture**:

- **IIFE Pattern**: Wrapped in immediately-invoked function expression for scope isolation
- **Web Speech API**: Uses `SpeechRecognition` or `webkitSpeechRecognition`
- **State Management**: Simple boolean flags and arrays for state

**Key Variables**:

```javascript
recognition; // SpeechRecognition instance (recreated periodically)
mediaStream; // MediaStream from getUserMedia
listening; // Boolean flag for active state
restartAttempts; // Counter for restart attempts (with exponential backoff)
lastActivityTime; // Timestamp of last recognition result (for monitoring)
activityMonitor; // Interval timer for detecting silent failures
transcripts; // Array of transcript objects {text, lang, time}
```

**Event Handlers**:

- `onstart`: Triggered when recognition begins
- `onend`: Handles session end and auto-restart logic
- `onerror`: Error handling with automatic retry for transient errors
- `onresult`: Processes speech recognition results

**Configuration**:

```javascript
recognition.continuous = true      // Keep listening continuously
recognition.interimResults = true  // Show real-time partial results
recognition.lang = <selected>      // Dynamic language selection
```

**Main Functions**:

- `createRecognition()`: Creates/recreates recognition instance with fresh event handlers
- `startCaptions()`: Requests microphone access, starts recognition, starts activity monitor
- `stopCaptions()`: Stops recognition, releases microphone, stops activity monitor
- `setLang(code)`: Updates recognition language
- `startActivityMonitor()`: Monitors for silent failures and forces restart if needed (every 30s check)
- `stopActivityMonitor()`: Clears the activity monitoring interval
- Download handler: Exports transcript to text file
- Periodic refresh: Recreates recognition instance every 30 minutes for long sessions

## 🌐 Browser Compatibility

### Fully Supported

- ✅ Google Chrome (desktop & mobile)
- ✅ Microsoft Edge (Chromium-based)
- ✅ Brave Browser
- ✅ Opera

### Limited/No Support

- ❌ Firefox (Web Speech API not implemented)
- ❌ Safari (limited/experimental support)

**Note**: The Web Speech API's `SpeechRecognition` interface is primarily supported in Chromium-based browsers. The app detects availability and disables functionality if unsupported.

## 🔑 Key Technical Concepts

### Web Speech API

The application uses the browser's built-in speech recognition capabilities:

```javascript
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
```

### Continuous Recognition

Unlike one-shot recognition, this uses continuous mode:

- Stays active until explicitly stopped
- Automatically restarts if interrupted (when auto-restart enabled)
- Handles multiple speech segments in one session

### Interim vs Final Results

- **Interim Results**: Real-time, may change as speech continues
- **Final Results**: Confirmed transcriptions, added to transcript history

### Microphone Configuration

Enhanced audio capture with:

```javascript
{
  echoCancellation: true,    // Reduces echo
  noiseSuppression: true,    // Filters background noise
  autoGainControl: true      // Normalizes volume
}
```

### Error Recovery

Comprehensive automatic retry logic with exponential backoff for transient errors:

- `network`: Network connectivity issues
- `no-speech`: No speech detected timeout
- `audio-capture`: Temporary audio capture problems
- `aborted`: Service aborted (common after long sessions) - **NEW**
- `service-not-allowed`: Service temporarily unavailable - **NEW**

**Smart Recovery Features**:
- Progressive delay (exponential backoff) prevents rapid restart loops
- Automatic instance recreation after multiple failures (5+ errors)
- Activity monitoring detects silent failures (5+ minutes no results)
- Periodic refresh every 30 minutes for ultra-long sessions

## 🎛️ Configuration Options

### Language Selection

Change the language at any time - the system will soft-restart to apply the new language immediately if already listening.

### Auto-Restart Toggle

- **Enabled**: Automatically restarts recognition after interruptions
- **Disabled**: Stops permanently when interrupted or on error

### Session Management

- Hidden tab behavior: Automatically stops recognition when tab is hidden (visibility API)
- Clean resource management: Microphone tracks properly released on stop

## 📊 Data Structure

### Transcript Object

Each captured phrase is stored as:

```javascript
{
  text: "transcribed text",
  lang: "en-US",
  time: "2025-11-13T10:30:45.123Z"
}
```

### Download Format

Exported transcripts follow this format:

```
[en-US] 2025-11-13T10:30:45.123Z — Hello world
[es-ES] 2025-11-13T10:31:12.456Z — Hola mundo
```

## 🐛 Error Handling

The application handles various error scenarios with comprehensive logging:

1. **No API Support**: Disables all controls, shows notice
2. **Microphone Denied**: Clear error message, remains idle, stops auto-restart
3. **Network Errors**: Automatic retry with exponential backoff (1s-5s)
4. **No Speech Detected**: Automatic restart attempt
5. **Audio Capture Issues**: Retry logic for transient problems
6. **Aborted Errors**: Handles service abortion (common after 1+ hour sessions)
7. **Service Unavailable**: Retry logic for temporary service issues
8. **Silent Failures**: Activity monitor detects and forces restart
9. **Console Logging**: All events logged with `[Captions]` prefix for debugging

## 🔐 Security & Privacy

- **Microphone Access**: Explicit permission request with getUserMedia
- **Client-Side Only**: All processing happens in the browser
- **No Data Transmission**: Speech data processed by browser's built-in service
- **Local Export**: Transcripts saved locally via browser download

**Note**: The Web Speech API in Chrome/Edge sends audio to Google's servers for processing. For privacy-sensitive applications, consider alternative solutions.

## 🔧 Recent Bug Fixes & Improvements

### Fixed: Captions Stopping After Extended Use

**Issue**: Captions would work initially but stop generating after some time with no console errors, making debugging difficult.

**Root Causes Identified**:
1. Missing 'aborted' error handling (common after long sessions)
2. Stale SpeechRecognition instances after extended periods
3. No activity monitoring for silent failures
4. Tab visibility issues not properly recovering
5. No logging for debugging

**Fixes Implemented**:

✅ **Comprehensive Error Handling**: Added handling for 'aborted', 'service-not-allowed', and other transient errors with automatic recovery

✅ **Instance Recreation**: Recognition instance is recreated after multiple restart failures or every 30 minutes to prevent staleness

✅ **Activity Monitor**: Detects silent failures (no activity for 5+ minutes) and proactively restarts

✅ **Smart Restart Logic**: Progressive delay (exponential backoff) to prevent rapid restart loops

✅ **Console Logging**: Detailed logging of all recognition events for debugging

✅ **Tab Visibility Recovery**: Properly resumes recognition when tab becomes visible again

✅ **Periodic Refresh**: Automatic refresh every 30 minutes for ultra-long sessions (1+ hours)

**Expected Behavior**: Captions now work continuously for 1+ hour sessions without interruption, with automatic recovery from any errors.

## 🚧 Limitations & Known Issues

1. **Browser Dependency**: Requires Chromium-based browsers
2. **Internet Required**: Web Speech API requires network connection
3. **Language Accuracy**: Varies by language and accent
4. **Continuous Session Limits**: ✅ FIXED - Automatic instance refresh every 30 minutes for extended sessions (1+ hours)
5. **Background Tabs**: ✅ IMPROVED - Recognition pauses when hidden and auto-resumes when visible

## 💡 Use Cases

- **Accessibility**: Real-time captions for hearing-impaired users
- **Transcription**: Meeting notes, lectures, interviews
- **Language Learning**: See transcriptions in different languages
- **Content Creation**: Quick text capture from speech
- **Prototyping**: Testing speech recognition capabilities

## 🔄 Future Enhancement Ideas

- [ ] Multiple speaker detection/identification
- [ ] Punctuation correction and formatting
- [ ] Export to different formats (JSON, SRT, VTT)
- [ ] Cloud save/sync capabilities
- [ ] Custom vocabulary/terminology support
- [ ] Real-time translation between languages
- [ ] Offline speech recognition (WebAssembly/TensorFlow.js)
- [ ] Audio recording alongside transcription

## 📝 For AI Models Reading This

### Project Purpose

This is a proof-of-concept demonstrating browser-based speech recognition capabilities using the Web Speech API.

### Code Flow

1. User clicks "Start captions"
2. `startCaptions()` requests microphone via `getUserMedia()`
3. `recognition.start()` initiates Web Speech API
4. `onresult` event fires continuously with speech data
5. Interim results shown in real-time
6. Final results added to transcript list
7. Auto-restart keeps session alive
8. User clicks "Stop" to end session

### Key Integration Points

- **Web Speech API**: Primary technology - check browser compatibility first
- **Media Streams API**: For microphone access
- **Blob API**: For transcript downloads
- **Visibility API**: For tab state management

### Modification Guidance

- **Adding Languages**: Update `<select>` options in `index.html`
- **Styling Changes**: Modify CSS variables in `:root` selector
- **Feature Additions**: Extend recognition event handlers in `app.js`
- **Error Handling**: Modify `onerror` handler logic

### Testing Considerations

- Requires HTTPS or localhost for microphone permissions
- Need actual microphone hardware for functional testing
- Browser compatibility testing essential
- Language accuracy varies - test target languages

## 📄 License

This is a proof-of-concept project. Use and modify as needed for your purposes.

## 🤝 Contributing

This is a POC project. Feel free to fork and enhance based on your needs.

---

**Last Updated**: November 13, 2025  
**Status**: Proof of Concept - Production Ready (Fixed for 1+ hour sessions)
