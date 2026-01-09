// ===== SCENARIO DATA =====
const scenarios = {
    tarif: {
        name: "Increase of Tariffs +25%",
        color: "#ff4444",
        chain: [
            {
                vt: "supply",
                problem: "🔴 IMPACT: US component prices +25%",
                consequence: "Supply costs spike dramatically. Existing contracts at risk.",
                solution: "European supplier found with competitive pricing. Alternative sourcing strategy activated."
            },
            {
                vt: "product",
                problem: "⚠️ CASCADE IMPACT: European components have different specs",
                consequence: "Due to new European supplier: Design compatibility issues detected. Certification requirements changed.",
                solution: "Design adjusted virtually using digital twin simulation. CAD models updated. New component integration validated."
            },
            {
                vt: "production",
                problem: "⚠️ CASCADE IMPACT: New component design requires production changes",
                consequence: "Due to updated product design: Assembly procedures must change. Production line needs reconfiguration.",
                solution: "Production layout optimized with digital twin. Virtual worker training deployed. Assembly time reduced by 15%.",
                final: "🎯 Crisis resolved with improved efficiency!"
            }
        ]
    },
    labor: {
        name: "Labor Shortage Crisis",
        color: "#ff6b35",
        chain: [
            {
                vt: "production",
                problem: "🔴 IMPACT: Workforce shortage -30%",
                consequence: "Production capacity severely limited. Delivery schedules at risk.",
                solution: "Critical tasks automated with digital twin simulation. Shift schedules optimized. Predictive maintenance activated."
            },
            {
                vt: "product",
                problem: "⚠️ CASCADE IMPACT: Reduced workforce limits testing capacity",
                consequence: "Due to automation focus: Manual quality assurance bottleneck created. Product validation cycles delayed.",
                solution: "Virtual testing protocols deployed via digital twin. AI-powered quality prediction activated. Automated inspection systems integrated."
            },
            {
                vt: "supply",
                problem: "⚠️ CASCADE IMPACT: Automated systems increase component variety",
                consequence: "Due to new automated processes: Inventory management complexity rises. Limited staff cannot handle increased SKU count.",
                solution: "Smart inventory optimization via digital twin. Automated vendor management deployed. Just-in-time delivery system perfected.",
                final: "🎯 Production maintained with 30% less workforce!"
            }
        ]
    },
    material: {
        name: "Material Change Required",
        color: "#9d4edd",
        chain: [
            {
                vt: "product",
                problem: "🔴 IMPACT: Key material discontinued by supplier",
                consequence: "Product cannot be manufactured with current design. Urgent redesign needed.",
                solution: "3 alternative materials identified via digital twin simulation. Performance tested across all scenarios. Optimal material validated."
            },
            {
                vt: "supply",
                problem: "⚠️ CASCADE IMPACT: New material requires different suppliers",
                consequence: "Due to alternative material selection: Supply chain must be restructured. New vendor qualification needed. Lead times uncertain.",
                solution: "New supplier network mapped globally. Logistics routes optimized. Favorable long-term contracts negotiated."
            },
            {
                vt: "production",
                problem: "⚠️ CASCADE IMPACT: New suppliers deliver material in different form",
                consequence: "Due to new supply chain: Manufacturing process must adapt. Equipment adjustments required. Process parameters unknown.",
                solution: "Optimal process parameters simulated via digital twin. Equipment settings updated remotely. Virtual operator training deployed. First-pass yield: 97%.",
                final: "🎯 Material transition complete with better performance!"
            }
        ]
    }
};

// ===== STATE MANAGEMENT =====
let currentScenario = null;
let currentStep = 0;
let canvas = null;
let ctx = null;
let drawnLines = []; // Store all drawn lines with their state
let clickedButton = null; // Store which button was clicked
let autoProgressTimer = null; // Timer for automatic progression
let countdownInterval = null; // Countdown interval for progress indicator

// ===== SUPABASE REAL-TIME SYNC =====
let supabaseClient = null;
let realtimeChannel = null;
let isController = false; // Am I controlling the session?
let sessionId = null; // Current session ID

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

// Function to show Issue and hide Working for a specific VT
function showIssue(vtType) {
    const issueActor = `Issue ${vtType.charAt(0).toUpperCase() + vtType.slice(1)}`;
    const workingActor = `Working ${vtType.charAt(0).toUpperCase() + vtType.slice(1)}`;

    toggleVisibility(issueActor, true);   // Show Issue
    toggleVisibility(workingActor, false); // Hide Working

    console.log(`Problem detected on ${vtType}: showing ${issueActor}, hiding ${workingActor}`);
}

// Function to hide Issue and show Working for a specific VT
function resolveIssue(vtType) {
    const issueActor = `Issue ${vtType.charAt(0).toUpperCase() + vtType.slice(1)}`;
    const workingActor = `Working ${vtType.charAt(0).toUpperCase() + vtType.slice(1)}`;

    toggleVisibility(issueActor, false);  // Hide Issue
    toggleVisibility(workingActor, true); // Show Working

    console.log(`Problem resolved on ${vtType}: hiding ${issueActor}, showing ${workingActor}`);
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', async () => {
    initStars();
    initCanvas();
    await initSupabase();
    initEventListeners();

    console.log("SDK Functions loaded - ready to toggle VT visibility");
    console.log("Supabase Real-time sync enabled - User ID:", window.USER_ID);
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

// ===== CANVAS SETUP =====
function initCanvas() {
    canvas = document.getElementById('connectionCanvas');
    ctx = canvas.getContext('2d');

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// ===== EVENT LISTENERS =====
function initEventListeners() {
    // Event buttons
    document.querySelectorAll('.event-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const eventType = e.target.dataset.event;
            clickedButton = e.target; // Store the clicked button
            startScenario(eventType);
        });
    });

    // Resolve button
    document.getElementById('resolveBtn').addEventListener('click', resolveCurrentProblem);

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', resetSystem);

    // VT click handlers
    document.querySelectorAll('.vt').forEach(vt => {
        vt.addEventListener('click', (e) => {
            const vtId = e.currentTarget.dataset.vt;
            if (e.currentTarget.classList.contains('has-problem')) {
                showMessage(vtId);
            }
        });
    });
}

// ===== SCENARIO FLOW =====
async function startScenario(eventType) {
    // Try to take control first
    const gotControl = await takeControl();
    if (!gotControl) {
        alert('Someone else is already controlling the session. Please wait.');
        return;
    }

    // Update Supabase session
    await updateSession({
        scenario_type: eventType,
        current_step: 0,
        state: 'scenario_started'
    });

    // Execute locally
    startScenarioLocal(eventType);
}

function startScenarioLocal(eventType) {
    // Disable all buttons
    document.querySelectorAll('.event-btn').forEach(btn => btn.disabled = true);

    currentScenario = scenarios[eventType];
    currentStep = 0;
    drawnLines = []; // Reset lines array

    // Store which button was clicked for line drawing
    if (!clickedButton) {
        clickedButton = document.querySelector(`.event-btn[data-event="${eventType}"]`);
    }

    // Clear all VT states
    document.querySelectorAll('.vt').forEach(vt => {
        vt.classList.remove('has-problem', 'solving', 'resolved');
    });

    // Start the first step
    setTimeout(() => {
        triggerStep();
    }, 500);
}

// For spectators - sync to existing scenario
function startScenarioSync(eventType, step) {
    currentScenario = scenarios[eventType];
    currentStep = step;
    drawnLines = [];

    // Store which button was clicked for line drawing
    if (!clickedButton) {
        clickedButton = document.querySelector(`.event-btn[data-event="${eventType}"]`);
    }

    // Disable all buttons
    document.querySelectorAll('.event-btn').forEach(btn => btn.disabled = true);

    // Clear all VT states
    document.querySelectorAll('.vt').forEach(vt => {
        vt.classList.remove('has-problem', 'solving', 'resolved');
    });

    // Trigger the current step for sync
    setTimeout(() => {
        triggerStepLocal();
    }, 500);
}

async function triggerStep() {
    // Update Supabase if controller
    if (isController) {
        await updateSession({
            current_step: currentStep,
            state: 'showing_impact'
        });
    }

    triggerStepLocal();
}

function triggerStepLocal() {
    const step = currentScenario.chain[currentStep];
    const targetVT = document.getElementById(`vt-${step.vt}`);

    // Find source position (button or previous VT)
    let sourcePos;
    if (currentStep === 0) {
        // From the button that was clicked
        sourcePos = getElementCenter(clickedButton);
    } else {
        // From previous VT
        const prevStep = currentScenario.chain[currentStep - 1];
        const prevVT = document.getElementById(`vt-${prevStep.vt}`);
        sourcePos = getElementCenter(prevVT);
    }

    const targetPos = getElementCenter(targetVT);

    // Draw animated connection and store it
    const lineIndex = drawnLines.length;
    const lineData = {
        start: sourcePos,
        end: targetPos,
        color: '#ff4444', // Red for problem
        resolved: false,
        stepIndex: currentStep
    };
    drawnLines.push(lineData);

    drawAnimatedLine(sourcePos, targetPos, '#ff4444', () => {
        // Add problem state to VT
        targetVT.classList.add('has-problem');

        // SDK: Show Issue, Hide Working when problem arrives
        showIssue(step.vt);

        // No popup - just continue automatically after a short delay
        setTimeout(async () => {
            await showResolution();
        }, 2000);
    });
}

// For spectators to sync
function triggerStepSync() {
    triggerStepLocal();
}

function showMessage(vtId) {
    const step = currentScenario.chain[currentStep];
    if (step.vt !== vtId) return;

    const popup = document.getElementById('messagePopup');
    const icon = popup.querySelector('.message-icon');
    const title = popup.querySelector('.message-title');
    const content = popup.querySelector('.message-content');
    const btn = document.getElementById('resolveBtn');

    // Set icon and title
    if (currentStep === 0) {
        icon.textContent = '🚨';
        title.textContent = 'PROBLEM DETECTED';
    } else {
        icon.textContent = '⚠️';
        title.textContent = 'CASCADE IMPACT';
    }

    // Show only impact and consequence first
    let impactContent = step.problem + '\n\n';
    impactContent += '📋 CONSEQUENCE:\n' + step.consequence;

    content.textContent = impactContent;

    // Hide button initially
    btn.style.display = 'none';

    // Show popup
    popup.classList.add('show');

    // After 6 seconds, show resolution automatically (4s × 1.5)
    startAutoProgress(6000, async () => {
        await showResolution();
    });
}

async function showResolution() {
    // Update Supabase if controller
    if (isController) {
        await updateSession({ state: 'showing_solution' });
    }

    showResolutionLocal();
}

function showResolutionLocal() {
    const step = currentScenario.chain[currentStep];

    // Mark VT as resolved
    resolveAndContinue();

    // No popup - continue automatically
    const isLastStep = currentStep >= currentScenario.chain.length - 1;

    setTimeout(async () => {
        if (isLastStep) {
            // End of scenario - show success briefly then reset
            await showSuccessScreen();
        } else {
            // Continue to next step
            currentStep++;
            await triggerStep();
        }
    }, 2000);
}

// For spectators to sync
function showResolutionSync() {
    showResolutionLocal();
}

function resolveAndContinue() {
    const step = currentScenario.chain[currentStep];
    const targetVT = document.getElementById(`vt-${step.vt}`);

    // Mark as resolved
    targetVT.classList.remove('has-problem');
    targetVT.classList.add('resolved');

    // SDK: Hide Issue, Show Working when problem is resolved
    resolveIssue(step.vt);

    // Change line color to green for this step
    if (drawnLines[currentStep]) {
        drawnLines[currentStep].color = '#2e7d32'; // Green
        drawnLines[currentStep].resolved = true;
        redrawAllLines();
    }
}

async function showSuccessScreen() {
    // Update Supabase if controller
    if (isController) {
        await updateSession({ state: 'success' });
    }

    showSuccessScreenLocal();
}

function showSuccessScreenLocal() {
    // No overlay - just trigger SDK visibility changes and auto-reset
    toggleVisibility("Web Cascade", false);
    toggleVisibility("Web Univers", true);
    console.log("Success - Web Cascade hidden, Web Univers displayed");

    // Auto-reset after 2 seconds
    setTimeout(async () => {
        await resetSystem();
    }, 2000);
}

// For spectators to sync
function showSuccessScreenSync() {
    showSuccessScreenLocal();
}

async function resetSystem() {
    // Release control and reset session
    await releaseControl();

    resetSystemLocal();
}

function resetSystemLocal() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Reset VT states
    document.querySelectorAll('.vt').forEach(vt => {
        vt.classList.remove('has-problem', 'solving', 'resolved');
    });

    // SDK: Reset all VTs to Working state (hide all Issues, show all Working)
    ['supply', 'product', 'production'].forEach(vtType => {
        const issueActor = `Issue ${vtType.charAt(0).toUpperCase() + vtType.slice(1)}`;
        const workingActor = `Working ${vtType.charAt(0).toUpperCase() + vtType.slice(1)}`;
        toggleVisibility(issueActor, false);  // Hide Issue
        toggleVisibility(workingActor, true); // Show Working
    });

    // SDK: Reset Web Cascade and Web Univers visibility
    toggleVisibility("Web Cascade", true);   // Show Web Cascade again
    toggleVisibility("Web Univers", false);  // Hide Web Univers

    console.log("System reset - all VTs back to Working state, Web Cascade visible");

    // Re-enable buttons
    document.querySelectorAll('.event-btn').forEach(btn => btn.disabled = false);

    // Reset state
    currentScenario = null;
    currentStep = 0;
    drawnLines = [];
    clickedButton = null;
}

// ===== SUPABASE INITIALIZATION =====
async function initSupabase() {
    // Initialize Supabase client using the global supabase object from CDN
    const { createClient } = supabase;
    supabaseClient = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

    // Get the session (should be only one row)
    const { data, error } = await supabaseClient
        .from('cascade_session')
        .select('*')
        .single();

    if (error) {
        console.error('Error fetching session:', error);
        return;
    }

    sessionId = data.id;
    console.log('Connected to session:', sessionId);

    // Subscribe to real-time changes
    realtimeChannel = supabaseClient
        .channel('cascade_session_changes')
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'cascade_session'
            },
            handleSessionUpdate
        )
        .subscribe();

    console.log('Real-time subscription active');
}

// ===== SUPABASE SYNC FUNCTIONS =====
async function updateSession(updates) {
    if (!isController) {
        console.log('Not controller - cannot update session');
        return;
    }

    const { error } = await supabaseClient
        .from('cascade_session')
        .update(updates)
        .eq('id', sessionId);

    if (error) {
        console.error('Error updating session:', error);
    }
}

async function takeControl() {
    // Try to take control
    const { data, error } = await supabaseClient
        .from('cascade_session')
        .select('controller_id')
        .eq('id', sessionId)
        .single();

    if (error) {
        console.error('Error checking controller:', error);
        return false;
    }

    // If no controller or controller is null, take control
    if (!data.controller_id || data.controller_id === 'null') {
        const { error: updateError } = await supabaseClient
            .from('cascade_session')
            .update({ controller_id: window.USER_ID })
            .eq('id', sessionId)
            .eq('controller_id', data.controller_id); // Ensure no race condition

        if (!updateError) {
            isController = true;
            console.log('Control acquired:', window.USER_ID);
            return true;
        }
    }

    console.log('Someone else has control:', data.controller_id);
    return false;
}

async function releaseControl() {
    if (isController) {
        await supabaseClient
            .from('cascade_session')
            .update({
                controller_id: null,
                state: 'idle',
                scenario_type: null,
                current_step: 0
            })
            .eq('id', sessionId);

        isController = false;
        console.log('Control released');
    }
}

function handleSessionUpdate(payload) {
    const newData = payload.new;
    console.log('Session updated:', newData);

    // Only sync if we're NOT the controller
    // (Spectators sync everything, controllers don't sync their own updates)
    if (!isController) {
        syncFromSession(newData);
    }
}

function syncFromSession(data) {
    console.log('Syncing from session state:', data.state);

    switch (data.state) {
        case 'idle':
            if (currentScenario) {
                resetSystemLocal();
            }
            break;

        case 'scenario_started':
            if (!currentScenario || currentScenario.name !== scenarios[data.scenario_type].name) {
                startScenarioSync(data.scenario_type, data.current_step);
            }
            break;

        case 'showing_impact':
            if (currentStep !== data.current_step) {
                currentStep = data.current_step;
                triggerStepSync();
            }
            break;

        case 'showing_solution':
            showResolutionSync();
            break;

        case 'success':
            showSuccessScreenSync();
            break;
    }
}

// ===== AUTO-PROGRESS FUNCTIONS =====
function startAutoProgress(duration, callback) {
    // Clear any existing timers
    stopAutoProgress();

    const indicator = document.getElementById('autoProgressIndicator');
    const countdown = document.getElementById('countdown');
    const progressFill = document.getElementById('progressFill');

    // Show the indicator
    indicator.classList.add('show');

    // Calculate countdown values
    const startTime = Date.now();
    const durationInSeconds = duration / 1000;
    let remainingSeconds = durationInSeconds;

    // Update countdown and progress bar
    countdown.textContent = Math.ceil(remainingSeconds);
    progressFill.style.width = '0%';

    // Update every 100ms for smooth animation
    countdownInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        remainingSeconds = Math.max(0, durationInSeconds - elapsed / 1000);

        // Update countdown text
        countdown.textContent = Math.ceil(remainingSeconds);

        // Update progress bar
        const progress = (elapsed / duration) * 100;
        progressFill.style.width = Math.min(100, progress) + '%';

        // Stop when complete
        if (remainingSeconds <= 0) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
    }, 100);

    // Set the auto-progress timer
    autoProgressTimer = setTimeout(() => {
        stopAutoProgress();
        callback();
    }, duration);
}

function stopAutoProgress() {
    // Clear timers
    if (autoProgressTimer) {
        clearTimeout(autoProgressTimer);
        autoProgressTimer = null;
    }
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }

    // Hide the indicator
    const indicator = document.getElementById('autoProgressIndicator');
    indicator.classList.remove('show');
}

// ===== DRAWING FUNCTIONS =====
function redrawAllLines() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Redraw all stored lines with their current colors
    drawnLines.forEach(line => {
        drawStaticLine(line.start, line.end, line.color);
    });
}

function drawStaticLine(start, end, color) {
    // Draw line with neon effect (multiple layers)

    // Outer glow (strongest)
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 12;
    ctx.shadowBlur = 40;
    ctx.shadowColor = color;
    ctx.globalAlpha = 0.3;
    ctx.stroke();

    // Middle glow
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 8;
    ctx.shadowBlur = 25;
    ctx.shadowColor = color;
    ctx.globalAlpha = 0.6;
    ctx.stroke();

    // Core line (bright)
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.shadowBlur = 15;
    ctx.shadowColor = color;
    ctx.globalAlpha = 1;
    ctx.stroke();

    // Draw arrowhead
    drawArrowhead(end.x, end.y, start, end, color);
}

function getElementCenter(element) {
    const rect = element.getBoundingClientRect();
    return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
    };
}

function drawAnimatedLine(start, end, color, callback) {
    const duration = 1000; // 1 second
    const startTime = Date.now();

    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Redraw all previous lines (except the current animating one)
        for (let i = 0; i < drawnLines.length - 1; i++) {
            const line = drawnLines[i];
            drawStaticLine(line.start, line.end, line.color);
        }

        // Calculate current end point for animating line
        const currentX = start.x + (end.x - start.x) * progress;
        const currentY = start.y + (end.y - start.y) * progress;

        // Draw animating line with neon effect

        // Outer glow
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(currentX, currentY);
        ctx.strokeStyle = color;
        ctx.lineWidth = 12;
        ctx.shadowBlur = 40;
        ctx.shadowColor = color;
        ctx.globalAlpha = 0.3;
        ctx.stroke();

        // Middle glow
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(currentX, currentY);
        ctx.strokeStyle = color;
        ctx.lineWidth = 8;
        ctx.shadowBlur = 25;
        ctx.shadowColor = color;
        ctx.globalAlpha = 0.6;
        ctx.stroke();

        // Core line
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(currentX, currentY);
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;
        ctx.globalAlpha = 1;
        ctx.stroke();

        // Draw arrowhead at current position
        if (progress > 0.1) {
            drawArrowhead(currentX, currentY, start, end, color);
        }

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            // Animation complete, redraw all lines including this one
            redrawAllLines();
            if (callback) callback();
        }
    }

    animate();
}

function drawArrowhead(x, y, start, end, color) {
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const arrowSize = 15;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-arrowSize, -arrowSize / 2);
    ctx.lineTo(-arrowSize, arrowSize / 2);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;
    ctx.fill();
    ctx.restore();
}
