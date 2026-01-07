// ===== PRESENTATION DATA WITH AUDIO TIMINGS =====
const slides = [
    {
        text: "Virtual Twin of the Product\n\nAt OXOS, the virtual twin is not just a 3D model.\nIt is the single, complete, and living reference of the product.",
        media: null,
        timestamp: 1 // Start at 1s
    },
    {
        text: "It concentrates all the product's intelligence in one place:\ndetailed bill of materials, exact configurations, manufacturing constraints, engineering and certification data, material history.",
        media: "PRD 1",
        timestamp: 7 // 7s
    },
    {
        text: "Before a single machine is powered on, we already know the predicted cycle time, material costs, geometric risks, and even the environmental footprint.",
        media: "PRD 2",
        timestamp: 20 // 20s
    },
    {
        text: "This virtual twin feeds OXOS's generative AI.\nConcretely, for the manufacturing of a housing, OXOS automatically generates the optimal machining sequence, the associated 5-axis CNC program, and the relevant quality inspections to fits with A&D regulations.",
        media: "PRD 3",
        timestamp: 29 // 29s
    },
    {
        text: "In production, the virtual twin tracks progress, quality status, and process deviations in real time.\nIn engineering and compliance, it ensures full traceability — from as-specified to as-maintained — with certification reports generated automatically.",
        media: "PRD 4",
        timestamp: 44 // 44s
    },
    {
        text: "With OXOS, industry moves from reactive execution\nto a predictive process, continuously auditable.",
        media: "PRD Content",
        timestamp: 59 // 59s
    }
];

// ===== SUPABASE STATE =====
let supabaseClient = null;
let realtimeChannel = null;
let sessionId = null;
let isLocalAction = false; // Flag to prevent update loops

// ===== STATE MANAGEMENT =====
let currentSlide = -1; // Start at -1 to show intro
let activeMedia = null; // Track currently visible media
let soundStarted = false; // Track if PRD Sound has been shown
let autoProgressTimer = null; // Timer for auto progression
let isPresentationRunning = false; // Track if presentation is running
let audioPlayer = null; // Audio element
let audioStartTime = null; // Track when audio started

// ===== SDK INTEGRATION =====
// Function to send visibility messages to the SDK platform
function toggleVisibility(actorName, visible) {
    console.log("toggleVisibility:", actorName, visible);
    window.parent.postMessage(JSON.stringify({
        action: "toggleVisibility",
        actor: actorName,
        visible: visible
    }), "*");
}

// Function to show 3D media
function showMedia(mediaName) {
    if (mediaName) {
        toggleVisibility(mediaName, true);
        activeMedia = mediaName;
        console.log(`Showing 3D object: ${mediaName}`);
    }
}

// Function to hide 3D media
function hideMedia(mediaName) {
    if (mediaName) {
        toggleVisibility(mediaName, false);
        console.log(`Hiding 3D object: ${mediaName}`);
    }
}

// Function to hide all media
function hideAllMedia() {
    const allMedia = ["PRD 1", "PRD 2", "PRD 3", "PRD 4", "PRD 5", "PRD Content"];
    allMedia.forEach(media => {
        toggleVisibility(media, false);
    });
    activeMedia = null;
    console.log("All 3D objects hidden");
}

// Function to hide AS IS Product only when presentation starts
function hideASISProduct() {
    toggleVisibility("AS IS Product", false);
    console.log("AS IS Product hidden");
}

// ===== SUPABASE SETUP =====
async function initSupabase() {
    try {
        // Initialize Supabase client
        supabaseClient = window.supabase.createClient(
            window.SUPABASE_URL,
            window.SUPABASE_ANON_KEY
        );

        console.log('Supabase client initialized');

        // Get or create session
        const { data, error } = await supabaseClient
            .from('oxos_auto_presentation_session')
            .select('*')
            .limit(1)
            .single();

        if (error) {
            console.error('Error fetching session:', error);
            return;
        }

        sessionId = data.id;
        console.log('Connected to session:', sessionId);

        // Subscribe to real-time updates
        realtimeChannel = supabaseClient
            .channel('oxos_auto_presentation_session_changes')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'oxos_auto_presentation_session'
                },
                handleSessionUpdate
            )
            .subscribe((status) => {
                console.log('Realtime subscription status:', status);
            });

        console.log('Product Auto Real-time subscription active');

    } catch (err) {
        console.error('Supabase initialization error:', err);
    }
}

// ===== SUPABASE UPDATE FUNCTIONS =====
async function updateSession(updates) {
    if (!supabaseClient || !sessionId) return;

    try {
        const { error } = await supabaseClient
            .from('oxos_auto_presentation_session')
            .update(updates)
            .eq('id', sessionId);

        if (error) {
            console.error('Error updating session:', error);
        } else {
            console.log('Session updated:', updates);
        }
    } catch (err) {
        console.error('Update error:', err);
    }
}

function handleSessionUpdate(payload) {
    console.log('Received update:', payload);

    if (isLocalAction) {
        console.log('Ignoring own update');
        return;
    }

    const newSlide = payload.new.current_slide;
    const audioTimestamp = payload.new.audio_timestamp;
    console.log('Syncing to slide:', newSlide, 'audio:', audioTimestamp);

    syncToSlide(newSlide, audioTimestamp);
}

async function syncToSlide(targetSlide, audioTimestamp) {
    // Set flag to prevent loop
    isLocalAction = true;

    if (targetSlide === -1 && currentSlide !== -1) {
        // Restart to beginning
        restartPresentationLocal();
    } else if (targetSlide === 0 && currentSlide === -1) {
        // Start presentation from beginning
        const nextBtn = document.getElementById('nextBtn');

        // Show PRD Sound and start audio presentation
        toggleVisibility("PRD Sound", true);
        soundStarted = true;
        isPresentationRunning = true;

        // Hide the button during auto-presentation
        nextBtn.style.display = 'none';

        // Start audio playback
        if (audioPlayer && !audioPlayer.playing) {
            try {
                // Sync audio to the timestamp if provided
                if (audioTimestamp !== undefined) {
                    audioPlayer.currentTime = audioTimestamp;
                }
                await audioPlayer.play();
                audioStartTime = Date.now();
                console.log('Audio started (synced)');
            } catch (error) {
                console.error('Error playing audio:', error);
            }
        }

        // Advance to first slide
        currentSlide = 0;
        nextSlideLocal();
    } else if (targetSlide > currentSlide) {
        // Sync forward progression (someone else advanced)
        // Make sure presentation is running
        if (!soundStarted) {
            const nextBtn = document.getElementById('nextBtn');
            toggleVisibility("PRD Sound", true);
            soundStarted = true;
            isPresentationRunning = true;
            nextBtn.style.display = 'none';

            // Start audio if not already playing
            if (audioPlayer && !audioPlayer.playing) {
                try {
                    if (audioTimestamp !== undefined) {
                        audioPlayer.currentTime = audioTimestamp;
                    }
                    await audioPlayer.play();
                    console.log('Audio started (synced)');
                } catch (error) {
                    console.error('Error playing audio:', error);
                }
            }
        }

        // Sync to target slide
        currentSlide = targetSlide;
        nextSlideLocal();
    }

    // Reset flag
    isLocalAction = false;
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    initStars();
    initPresentation();
    initSupabase();

    console.log("Product Presentation (Auto) loaded - SDK ready");
});

// ===== STARS CREATION =====
function initStars() {
    const starsContainer = document.getElementById('stars');
    const starCount = 150;

    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'star';

        const size = Math.random() * 2 + 0.5;
        star.style.width = size + 'px';
        star.style.height = size + 'px';
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.animationDelay = Math.random() * 3 + 's';
        star.style.animationDuration = (Math.random() * 2 + 2) + 's';

        starsContainer.appendChild(star);
    }
}

// ===== PRESENTATION LOGIC =====
function initPresentation() {
    const nextBtn = document.getElementById('nextBtn');
    const textContent = document.getElementById('textContent');

    // Create audio player
    audioPlayer = new Audio('VT-Product.mp3');
    audioPlayer.addEventListener('timeupdate', handleAudioTimeUpdate);
    audioPlayer.addEventListener('ended', handleAudioEnded);

    // Hide all PRD media at start (but NOT AS IS Product yet)
    hideAllMedia();

    // Hide PRD Sound initially
    toggleVisibility("PRD Sound", false);

    // Show intro state
    setTimeout(() => {
        textContent.classList.add('show');
        nextBtn.classList.add('show');
    }, 300);

    // Next button click handler
    nextBtn.addEventListener('click', nextSlide);

    // Update progress
    updateProgress();
}

// Handle audio time updates to sync slides
function handleAudioTimeUpdate() {
    if (!isPresentationRunning || !audioPlayer) return;

    const currentTime = audioPlayer.currentTime;

    // Find the next slide that should be shown based on audio time
    for (let i = slides.length - 1; i >= 0; i--) {
        if (currentTime >= slides[i].timestamp && currentSlide < i) {
            currentSlide = i;
            nextSlideLocal();
            break;
        }
    }
}

// Handle audio ended
function handleAudioEnded() {
    console.log('Audio ended');
    isPresentationRunning = false;

    // Show finish button
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn && currentSlide === slides.length - 1) {
        nextBtn.style.display = 'block';
        nextBtn.querySelector('.btn-text').textContent = 'Finish';
        nextBtn.onclick = showEndScreen;
    }
}

async function nextSlide() {
    const nextBtn = document.getElementById('nextBtn');

    // On first click, show PRD Sound and start audio presentation
    if (!soundStarted) {
        // Update Supabase FIRST to sync with all clients (BEFORE changing local state)
        if (!isLocalAction) {
            await updateSession({
                current_slide: 0,
                audio_timestamp: 0
            });
        }

        // Now update local state
        toggleVisibility("PRD Sound", true);
        soundStarted = true;
        isPresentationRunning = true;

        // Hide the button during auto-presentation
        nextBtn.style.display = 'none';

        // Start audio playback
        if (audioPlayer) {
            try {
                await audioPlayer.play();
                audioStartTime = Date.now();
                console.log('Audio started');
            } catch (error) {
                console.error('Error playing audio:', error);
            }
        }

        // Show first slide
        currentSlide = 0;
        nextSlideLocal();
    }
}

function nextSlideLocal() {
    const textContent = document.getElementById('textContent');
    const slideText = textContent.querySelector('.slide-text');
    const nextBtn = document.getElementById('nextBtn');

    // Animate out current text
    textContent.classList.remove('show');
    textContent.classList.add('slide-out');

    setTimeout(() => {
        // Update text content
        const slide = slides[currentSlide];
        slideText.textContent = slide.text;

        // Show new media if present (without hiding previous ones)
        if (slide.media) {
            showMedia(slide.media);

            // Hide AS IS Product when showing PRD Content (last media)
            if (slide.media === "PRD Content") {
                hideASISProduct();
            }
        }

        // Animate in new text
        textContent.classList.remove('slide-out');
        textContent.classList.add('slide-in');

        setTimeout(() => {
            textContent.classList.remove('slide-in');
            textContent.classList.add('show');
        }, 100);

        // Update progress
        updateProgress();

        // Check if this is the last slide
        if (currentSlide === slides.length - 1) {
            // Last slide - show finish button after audio ends
            // The finish button will be shown by handleAudioEnded
        }
    }, 500);
}

function showEndScreen() {
    const textContent = document.getElementById('textContent');
    const slideText = textContent.querySelector('.slide-text');
    const nextBtn = document.getElementById('nextBtn');

    // Animate out
    textContent.classList.remove('show');
    nextBtn.classList.remove('show');

    setTimeout(() => {
        slideText.innerHTML = '<strong>Thank you</strong><br>Presentation Complete';

        textContent.classList.add('show');

        // Change button to restart
        nextBtn.querySelector('.btn-text').textContent = 'Restart Presentation';
        nextBtn.querySelector('.btn-icon').textContent = '↻';
        nextBtn.onclick = restartPresentation;

        setTimeout(() => {
            nextBtn.classList.add('show');
        }, 500);
    }, 600);
}

async function restartPresentation() {
    // Update Supabase to sync with all clients
    if (!isLocalAction) {
        await updateSession({ current_slide: -1 });
    }
    restartPresentationLocal();
}

function restartPresentationLocal() {
    // Stop audio
    if (audioPlayer) {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
    }

    // Clear any running timer
    if (autoProgressTimer) {
        clearTimeout(autoProgressTimer);
        autoProgressTimer = null;
    }

    // Hide all media
    hideAllMedia();

    // Show AS IS Product again when restarting
    toggleVisibility("AS IS Product", true);

    // Hide PRD Sound when restarting (it will show on first click)
    toggleVisibility("PRD Sound", false);

    // Reset state
    currentSlide = -1;
    soundStarted = false;
    isPresentationRunning = false;

    // Reset button
    const nextBtn = document.getElementById('nextBtn');
    nextBtn.style.display = 'block';
    nextBtn.querySelector('.btn-text').textContent = 'Start Presentation';
    nextBtn.querySelector('.btn-icon').textContent = '→';
    nextBtn.onclick = nextSlide;

    // Reset content
    const textContent = document.getElementById('textContent');
    const slideText = textContent.querySelector('.slide-text');
    slideText.textContent = '';

    // Update progress
    updateProgress();

    console.log("Presentation restarted");
}

function updateProgress() {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');

    const total = slides.length;
    const current = Math.max(0, currentSlide + 1);
    const percentage = (current / total) * 100;

    // Simpler approach - directly set width via inline style
    const barFill = document.createElement('div');
    barFill.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: ${percentage}%;
        background: linear-gradient(90deg, #1976d2, #4da6ff);
        border-radius: 10px;
        transition: width 0.6s ease;
        box-shadow: 0 0 10px rgba(77, 166, 255, 0.8);
    `;

    // Clear and add new fill
    progressBar.innerHTML = '';
    progressBar.appendChild(barFill);

    // Update text
    progressText.textContent = `${current} / ${total}`;
}
