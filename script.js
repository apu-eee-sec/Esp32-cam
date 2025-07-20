document.addEventListener("DOMContentLoaded", () => {
  const videoElement = document.getElementById("video-stream")
  const streamPlaceholder = document.getElementById("stream-placeholder")
  const cameraIdInput = document.getElementById("camera-id")
  const connectBtn = document.getElementById("connect-btn")
  const fullscreenBtn = document.getElementById("fullscreen-btn")
  const connectionStatus = document.getElementById("connection-status")

  let peer = null
  let connection = null
  let isConnected = false

  // Import PeerJS library
  const Peer = window.Peer

  // Try to load saved camera ID from localStorage
  const savedCameraId = localStorage.getItem("cameraId")
  if (savedCameraId) {
    cameraIdInput.value = savedCameraId
  }

  // Initialize PeerJS
  function initPeer() {
    // Using the free PeerJS server for signaling
    peer = new Peer({
      host: "peerjs-server.herokuapp.com",
      secure: true,
      port: 443,
      debug: 3,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
          {
            urls: "turn:numb.viagenie.ca",
            credential: "muazkh",
            username: "webrtc@live.com",
          },
        ],
      },
    })

    peer.on("open", (id) => {
      console.log("My peer ID is: " + id)
      connectionStatus.textContent = "Viewer ready. Enter camera ID to connect."
    })

    peer.on("error", (err) => {
      console.error("PeerJS error:", err)
      connectionStatus.textContent = "Connection error: " + err.message
      connectionStatus.className = ""
      resetConnection()
    })
  }

  // Connect to camera
  connectBtn.addEventListener("click", () => {
    const cameraId = cameraIdInput.value.trim()

    if (!cameraId) {
      alert("Please enter the camera ID")
      return
    }

    if (isConnected) {
      // Disconnect
      disconnectFromCamera()
    } else {
      // Connect
      connectToCamera(cameraId)
    }
  })

  // Toggle fullscreen
  fullscreenBtn.addEventListener("click", () => {
    if (!isConnected) {
      alert("Please connect to a camera first")
      return
    }

    if (videoElement.requestFullscreen) {
      videoElement.requestFullscreen()
    } else if (videoElement.webkitRequestFullscreen) {
      videoElement.webkitRequestFullscreen()
    } else if (videoElement.msRequestFullscreen) {
      videoElement.msRequestFullscreen()
    }
  })

  function connectToCamera(cameraId) {
    // Save camera ID to localStorage
    localStorage.setItem("cameraId", cameraId)

    // Initialize PeerJS if not already initialized
    if (!peer) {
      initPeer()
    }

    // Update UI
    connectionStatus.textContent = "Connecting to camera..."
    connectionStatus.className = "connecting"
    connectBtn.disabled = true

    // Wait a moment for peer to initialize if needed
    setTimeout(() => {
      // Call the camera
      const call = peer.call(cameraId, new MediaStream())

      call.on("stream", (remoteStream) => {
        // We got a stream from the camera
        videoElement.srcObject = remoteStream
        videoElement.style.display = "block"
        streamPlaceholder.style.display = "none"
        connectionStatus.textContent = "Connected to camera"
        connectionStatus.className = "connected"
        connectBtn.textContent = "Disconnect"
        connectBtn.disabled = false
        isConnected = true
      })

      call.on("close", () => {
        disconnectFromCamera()
      })

      call.on("error", (err) => {
        console.error("Call error:", err)
        connectionStatus.textContent = "Call error: " + err.message
        connectionStatus.className = ""
        resetConnection()
      })

      // Also establish a data connection for control messages
      connection = peer.connect(cameraId)

      connection.on("open", () => {
        console.log("Data connection established")

        // Send a hello message
        connection.send({
          type: "hello",
          message: "Viewer connected",
        })
      })

      connection.on("data", (data) => {
        console.log("Received data:", data)
        // Handle any control messages from the camera
      })

      connection.on("close", () => {
        console.log("Data connection closed")
        disconnectFromCamera()
      })

      // Set timeout for connection
      setTimeout(() => {
        if (!isConnected) {
          connectionStatus.textContent =
            "Connection timed out. Make sure the camera ID is correct and the camera is online."
          connectionStatus.className = ""
          resetConnection()
        }
      }, 15000)
    }, 1000)
  }

  function disconnectFromCamera() {
    if (connection) {
      connection.close()
    }

    if (videoElement.srcObject) {
      const tracks = videoElement.srcObject.getTracks()
      tracks.forEach((track) => track.stop())
      videoElement.srcObject = null
    }

    resetConnection()
  }

  function resetConnection() {
    // Reset UI
    videoElement.style.display = "none"
    streamPlaceholder.style.display = "flex"
    connectBtn.textContent = "Connect"
    connectBtn.disabled = false
    isConnected = false

    // Close and recreate peer connection to ensure clean state
    if (peer) {
      peer.destroy()
      peer = null
    }

    connection = null
  }

  // Initialize on page load
  initPeer()
})
