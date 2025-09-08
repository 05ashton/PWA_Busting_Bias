/*
  Busting Bias Game - JavaScript
  Beginner-friendly inline comments added throughout.
  Functionality:
    - Shows a shuffled sequence of "alien" images
    - Player categorizes each alien using Left/Right buttons or arrow keys
    - Plays sounds on correct/incorrect
    - Keeps score
    - Logs each attempt into a Recap with thumbnail, choice, assigned category (Positive/Negative),
      and a ✔ / ✘ mark. Rows alternate colors for readability.
    - Skip to End button reveals the recap immediately
    - Restart restarts the game
*/

/* ----------------------------
   Service Worker Registration
   ----------------------------
   This block registers a service worker if the browser supports it.
   A service worker can help with offline support (optional).
*/
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/service-worker.js")
        .then((reg) => console.log("SW registered", reg.scope))
        .catch((err) => console.error("SW registration failed", err));
    });
  }
  
  /* ----------------------------
     Main DOMContentLoaded wrapper
     ----------------------------
     We wait for the DOM to finish loading so all elements are present.
     Then we grab references to elements and wire up event listeners.
  */
  document.addEventListener("DOMContentLoaded", () => {
    /* -------------------------
       Element references (cached)
       -------------------------
       We store references to DOM elements we will update often.
       Using const helps prevent accidental reassignment.
    */
    const stimulus = document.getElementById("stimulus");         // where alien image appears
    const feedback = document.getElementById("feedback");         // text shown after a response
    const leftButton = document.getElementById("left-button");    // negative choice
    const rightButton = document.getElementById("right-button");  // positive choice
    const restartButton = document.getElementById("restart");    // restart control
    const skipButton = document.getElementById("skip-to-end");   // skip to end control
    const gameOverMsg = document.getElementById("game-over");    // "Game Over" message
    const scoreDisplay = document.getElementById("score");       // score text on page
  
    // Recap UI
    const attemptsPanel = document.getElementById("attempts-panel"); // container for recap
    const attemptsList  = document.getElementById("attempts-list");  // where rows are appended
  
    /* -------------------------
       Sounds
       -------------------------
       Preload short sounds for immediate playback on responses.
       Paths must match actual files on your server.
    */
    const positiveSound = new Audio("/sounds/positive.wav");
    const negativeSound = new Audio("/sounds/negative.wav");
  
    /* -------------------------
       Stimuli setup
       -------------------------
       We create a list of stimuli (image path + correct category).
       - alienTypes and alienColors are small arrays so beginners can see how
         stimuli are generated.
       - The "correct" field is either "right" (Positive) or "left" (Negative).
       - You can add more colors/types — just follow the file naming convention:
         /images/<type>_<color>.png  e.g., /images/alien01_blue.png
    */
    const alienColors = ["blue", "brown", "green", "grey"];      // simple set of colors
    const alienTypes  = ["alien01", "alien02"];                 // set of alien types
  
    // Build the original unshuffled stimuli list
    const originalStimuli = [];
    alienTypes.forEach((type, tIndex) => {
      alienColors.forEach((color, cIndex) => {
        // Construct the expected image path
        const imagePath = `/images/${type}_${color}.png`;
  
        // Alternate categories so we have both Positive and Negative examples
        // (simple parity trick: even => right, odd => left)
        const category = (tIndex + cIndex) % 2 === 0 ? "right" : "left";
  
        // Each stimulus is an object with the image path and the correct category
        originalStimuli.push({ image: imagePath, correct: category });
      });
    });
  
    /* -------------------------
       Game state variables
       -------------------------
       These variables change during gameplay:
       - stimuli: the shuffled stimuli array used for the current playthrough
       - currentIndex: which trial we're on (0-based)
       - score: number of correct responses so far
    */
    let stimuli = [];       // will be populated at game start
    let currentIndex = 0;
    let score = 0;
  
    /* -------------------------
       Utility: shuffleArray
       -------------------------
       Randomize an array's order. This uses a simple sort-random trick
       that's fine for small arrays and prototyping.
       (There are more robust shuffles like Fisher-Yates for production.)
    */
    function shuffleArray(array) {
      return array.sort(() => Math.random() - 0.5);
    }
  
    /* -------------------------
       initGame()
       -------------------------
       Reset everything and show the first stimulus.
       This is also called when Restart is pressed.
    */
    function initGame() {
      // copy & shuffle the original stimuli so we don't mutate it
      stimuli = shuffleArray([...originalStimuli]);
  
      currentIndex = 0;            // start at the first item
      score = 0;                   // reset score
      scoreDisplay.textContent = "Score: 0"; // reset score in UI
  
      // re-enable controls and hide end-of-game UI
      leftButton.disabled = false;
      rightButton.disabled = false;
      restartButton.hidden = true;   // hide restart while playing
      skipButton.hidden = false;     // allow skipping during play
      gameOverMsg.hidden = true;     // hide game over text
      attemptsPanel.hidden = true;   // hide recap until the end
      attemptsList.innerHTML = "";   // clear old recap rows
  
      // show the first stimulus
      showNextStimulus();
    }
  
    /* -------------------------
       showNextStimulus()
       -------------------------
       Render the current stimulus (image) into #stimulus.
       If we run out of stimuli, call endGame().
    */
    function showNextStimulus() {
      if (currentIndex < stimuli.length) {
        const alien = stimuli[currentIndex];
  
        // Insert an <img> so the CSS can size it responsively.
        // alt text helps screen readers.
        stimulus.innerHTML = `<img src="${alien.image}" alt="Alien ${currentIndex + 1}" style="max-width:100%; height:auto;">`;
  
        // clear any prior feedback text
        feedback.textContent = "";
      } else {
        // no more trials
        endGame();
      }
    }
  
    /* -------------------------
       logAttempt(alien, choice)
       -------------------------
       Append a row to the recap that includes:
         - thumbnail image
         - player's choice (LEFT or RIGHT)
         - the category assigned to that alien (Positive or Negative)
           -> Positive uses the "right" category (green)
           -> Negative uses the "left" category (red)
         - a ✔ or ✘ indicating whether the player's choice matched the correct category
    */
    function logAttempt(alien, choice) {
      // Determine if the player's choice matched the correct category
      const isCorrect = choice === alien.correct;
  
      // Create a container for the row
      const item = document.createElement("div");
      item.className = "attempt-item"; // CSS handles alternating background
  
      // We add four columns: thumbnail, choice, assigned category, correctness mark
      // Use template string for readability. Note the class on the category span:
      // if alien.correct === "right" we use .positive (green); otherwise .negative (red)
      item.innerHTML = `
        <img src="${alien.image}" alt="Thumbnail">
        <span>${choice.toUpperCase()}</span>
        <span class="${alien.correct === "right" ? "positive" : "negative"}">
          ${alien.correct === "right" ? "Positive" : "Negative"}
        </span>
        <span>${isCorrect ? "✔" : "✘"}</span>
      `;
  
      // Append the row to the recap list
      attemptsList.appendChild(item);
    }
  
    /* -------------------------
       handleResponse(choice)
       -------------------------
       Called when the player makes a choice ("left" or "right").
       - Plays sounds
       - Updates score and feedback text
       - Logs the attempt to the recap
       - Moves to the next stimulus after a short delay so the player sees feedback
    */
    function handleResponse(choice) {
      // Guard: don't accept responses if we are already past the last stimulus
      if (currentIndex >= stimuli.length) return;
  
      const alien = stimuli[currentIndex];      // the stimulus for this trial
      const isCorrect = choice === alien.correct;
  
      // Show feedback text and play appropriate sound
      if (isCorrect) {
        feedback.textContent = "Positive";    // text shown in the feedback area
        positiveSound.play();                 // play positive sound
        score++;                              // increment score
        scoreDisplay.textContent = `Score: ${score}`; // update UI
      } else {
        feedback.textContent = "Negative";
        negativeSound.play();
      }
  
      // Log this attempt into the recap panel (thumbnail + details)
      logAttempt(alien, choice);
  
      // Move on to the next stimulus after a short pause (600ms)
      // The pause gives time for feedback and sound to register.
      setTimeout(() => {
        currentIndex++;
        showNextStimulus();
      }, 600);
    }
  
    /* -------------------------
       endGame()
       -------------------------
       Called when the player finishes all stimuli or presses Skip to End.
       - Shows "Game Over"
       - Disables controls
       - Shows the recap panel with the logged attempts
    */
    function endGame() {
      // Clear the stimulus area (no image)
      stimulus.innerHTML = "";
  
      // Show game over message
      gameOverMsg.textContent = "Game Over!";
      gameOverMsg.hidden = false;
  
      // Disable buttons so the player can't respond further
      leftButton.disabled = true;
      rightButton.disabled = true;
  
      // Show restart button (allowing a new playthrough)
      restartButton.hidden = false;
  
      // Hide skip (we're already at end)
      skipButton.hidden = true;
  
      // Reveal the recap panel created during play
      attemptsPanel.hidden = false;
    }
  
    /* -------------------------
       Event listeners (user interactions)
       -------------------------
       These wire up the UI controls to the functions above.
    */
    restartButton.addEventListener("click", initGame);  // restart the game
    skipButton.addEventListener("click", endGame);      // skip straight to results
  
    // Left / Right button handlers
    leftButton.addEventListener("click", () => handleResponse("left"));
    rightButton.addEventListener("click", () => handleResponse("right"));
  
    // Keyboard support: ArrowLeft and ArrowRight behave like the buttons
    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft")  handleResponse("left");
      if (e.key === "ArrowRight") handleResponse("right");
    });
  
    // Start the first game automatically when page loads
    initGame();
  });