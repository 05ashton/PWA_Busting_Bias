/*
Busting Bias Game 
Author: Ashton Curl
Year: 2025
*/

/* -----------------------------------------------------------
   SERVICE WORKER SETUP (for offline support like a mobile app)
------------------------------------------------------------ */

// First, check if the browser knows what a "serviceWorker" is.
// A service worker is a special script that allows your site
// to work offline or load faster by caching files.
if ("serviceWorker" in navigator) {

    // Tell the browser: "Wait until the whole page finishes loading."
    window.addEventListener("load", () => {

        // Then register (connect) the service worker file you made
        // called "service-worker.js".
        navigator.serviceWorker
            .register("/service-worker.js")

            // If it works, print "SW registered" to the console log
            // along with its scope (the part of the site it controls).
            .then((reg) => console.log("SW registered", reg.scope))

            // If something goes wrong, print an error to the console.
            .catch((err) => console.error("SW registration failed", err));
    });
}


/* -----------------------------------------------------------
   MAIN GAME CODE STARTS HERE
   We wait for the "DOMContentLoaded" event so the browser
   has finished reading all HTML elements before we use them.
------------------------------------------------------------ */
document.addEventListener('DOMContentLoaded', () => {

  /* -------------------------------
     1. CONNECT TO HTML ELEMENTS
  --------------------------------*/

  // These lines "grab" pieces of your HTML by their ID.
  // After this, we can change them using JavaScript.
  const stimulus = document.getElementById('stimulus');   // The main word the player sees
  const feedback = document.getElementById('feedback');   // The ✔ or ✘ shown after answering
  const leftButton = document.getElementById('left-button');   // The button for left choice
  const rightButton = document.getElementById('right-button'); // The button for right choice
  const scoreDisplay = document.getElementById('score');       // Where the score is shown
  const restartButton = document.getElementById('restart');    // Restart game button
  const gameOverMsg = document.getElementById('game-over');    // Message shown when game ends

  // Sounds for correct/incorrect answers (from <audio> tags in HTML)
  const correctSound = document.getElementById('correct-sound');
  const incorrectSound = document.getElementById('incorrect-sound');

  /* -------------------------------
     2. GAME DATA
  --------------------------------*/

  // The "originalStimuli" is like a deck of cards. Each object
  // has a "word" and the correct side (left/right).
  const originalStimuli = [
      { word: 'Apple', correct: 'left' },
      { word: 'Banana', correct: 'right' },
      { word: 'Dog', correct: 'right' },
      { word: 'Car', correct: 'left' }
  ];

  // These variables keep track of the game as it runs:
  let stimuli = [];        // Holds the shuffled version of the word list
  let currentIndex = 0;    // Which word we are currently showing
  let score = 0;           // The player’s score
  let responses = [];      // Stores each answer the player makes

  // Beginner-friendly comment: This variable stores the time when the current word appeared on screen
  let startTime = 0; // Tracks when the current stimulus was shown

  /* -------------------------------
     3. HELPER FUNCTIONS
  --------------------------------*/

  // Randomly shuffle the array of words so the order changes every game.
  function shuffleArray(array) {
      return array.sort(() => Math.random() - 0.5);
  }

  // Reset everything to start a new game.
  function initGame() {
      stimuli = shuffleArray([...originalStimuli]); // Make a shuffled copy of the list
      currentIndex = 0;    // Start from first word
      score = 0;           // Reset score
      responses = [];      // Clear old answers

      // Re-enable the buttons in case they were disabled after game over
      leftButton.disabled = false;
      rightButton.disabled = false;

      // Hide restart button and game over message until needed
      restartButton.hidden = true;
      gameOverMsg.hidden = true;

      // Hide attempts panel and trophies section at start
      const attemptsPanelAtStart = document.getElementById('attempts-panel');
      const trophiesSectionAtStart = document.getElementById('trophies-section');

      // Beginner-friendly: we use BOTH the HTML `hidden` attribute AND CSS `display:none`.
      // Some CSS rules can override `hidden`, so `display:none` is a safe extra step.
      attemptsPanelAtStart.hidden = true;
      trophiesSectionAtStart.hidden = true;
      attemptsPanelAtStart.style.display = 'none';
      trophiesSectionAtStart.style.display = 'none';

      // Update the score display (shows "Score: 0")
      updateScoreDisplay();

      // Show the very first word
      showNextStimulus();
  }

  // Show the next word on the screen with a fun animation.
  function showNextStimulus() {
      if (currentIndex < stimuli.length) {

          // Remove old animation classes in case they are still active
          stimulus.classList.remove('slide-in-left', 'slide-in-right', 'shake');

          // If the word belongs to "left", slide it in from the left.
          // Otherwise, slide it in from the right.
          const animClass = (stimuli[currentIndex].correct === 'left')
              ? 'slide-in-left'
              : 'slide-in-right';

          // This line forces the browser to reset before adding new class.
          void stimulus.offsetWidth;

          // Add the animation class and show the word
          stimulus.classList.add(animClass);
          stimulus.textContent = stimuli[currentIndex].word;

          // Beginner-friendly comment: Record the time when this word appeared, so we can measure response speed
          startTime = Date.now();
      } else {
          // If we’ve shown all words, end the game.
          endGame();
      }
  }

  // Show ✔ or ✘ after an answer
  function showFeedback(isCorrect) {
      // Change text based on correct or not
      feedback.textContent = isCorrect ? '✔' : '✘';

      // Add CSS class so it shows green/red styles
      feedback.className = isCorrect ? 'correct' : 'incorrect';

      // Make it visible
      feedback.style.display = 'block';

      // Play the correct or incorrect sound
      isCorrect ? correctSound.play() : incorrectSound.play();

      // If wrong, make the word "shake" for extra feedback
      if (!isCorrect) {
          stimulus.classList.add('shake');
          setTimeout(() => stimulus.classList.remove('shake'), 400);
      }

      // After 0.6 seconds, hide feedback and move on
      setTimeout(() => {
          feedback.style.display = 'none';
          currentIndex++;         // Go to the next word
          showNextStimulus();     // Display it
      }, 600);
  }

  // Handle when the player chooses left or right
  function handleResponse(choice) {
      // If no words left, do nothing
      if (currentIndex >= stimuli.length) return;

      // Grab the current word object
      const wordObj = stimuli[currentIndex];

      // Check if the player’s choice matches the correct answer
      const isCorrect = (choice === wordObj.correct);

      // Increase score if correct
      if (isCorrect) score++;

      // Update the score on screen
      updateScoreDisplay();

      // Beginner-friendly comment: Calculate how long it took the player to answer (in seconds)
      const timeTaken = (Date.now() - startTime) / 1000;

      // Beginner-friendly: also store the correct answer so we can show it later in the attempts panel
      saveResponse({ word: wordObj.word, choice, isCorrect, timeTaken, correctAnswer: wordObj.correct });

      // Show ✔ or ✘ feedback
      showFeedback(isCorrect);
  }

  // Update the text that shows score.
  function updateScoreDisplay(final = false) {
      scoreDisplay.textContent = final
          ? `Final Score: ${score} / ${stimuli.length}` // At game over
          : `Score: ${score}`; // During the game
  }

  // Save player’s answers to localStorage so it remembers across page reloads
  function saveResponse(response) {
      responses.push(response);
      localStorage.setItem('gameData', JSON.stringify(responses));
  }

  /* -------------------------------
     4. TROPHIES AND GAME OVER
  --------------------------------*/

  // Check if the player earned any trophies
  function checkTrophies(score, responses) {
      const trophies = [];
      const totalQuestions = responses.length;

      // Trophy if player got everything right
      if (score === totalQuestions) {
          trophies.push('🏆 Perfect Score: You got everything right!');
      }

      // Trophy for playing at least 10 rounds
      if (responses.length >= 10) {
          trophies.push('🏆 Persistence: You played 10 or more rounds!');
      }

      // Trophy for answering 5 questions in under 2 seconds
      const fastResponses = responses.filter(response => response.timeTaken <= 2);
      if (fastResponses.length >= 5) {
          trophies.push('🏆 Fast Swiper: You responded quickly 5 or more times!');
      }

      return trophies;
  }

  // End the game and show the results
  function endGame() {
      // Beginner-friendly: This console message helps confirm we reached the end game logic
      console.debug('[Busting Bias] endGame() reached');

      // Replace the word with "Game Over!"
      stimulus.textContent = '🎉 Game Over!';

      // Show final score
      updateScoreDisplay(true);

      // Disable the buttons
      leftButton.disabled = true;
      rightButton.disabled = true;

      // Show game over message
      gameOverMsg.textContent = `You scored ${score} out of ${stimuli.length}!`;
      gameOverMsg.hidden = false;

      // Show the restart button
      restartButton.hidden = false;

      // Show all attempts the player made
      const attemptsPanel = document.getElementById('attempts-panel');
      const attemptsList = document.getElementById('attempts-list');
      attemptsList.innerHTML = ''; // Clear previous attempts

      // Beginner-friendly: Build a detailed attempts list with index, your choice, the correct side, ✔/✘, and time.
      responses.forEach((response) => {
          const attemptItem = document.createElement('div');
          attemptItem.classList.add('attempt-item', response.isCorrect ? 'correct' : 'incorrect');

          // Friendly labels for left/right
          const chosenLabel = response.choice === 'left' ? 'Left' : 'Right';
          const correctLabel = response.correctAnswer
              ? (response.correctAnswer === 'left' ? 'Left' : 'Right')
              // Fallback if older saved data didn't include `correctAnswer`
              : (response.isCorrect ? chosenLabel : (response.choice === 'left' ? 'Right' : 'Left'));

          // Show time in seconds to one decimal place (or a dash if unavailable)
          const seconds = (typeof response.timeTaken === 'number' && !Number.isNaN(response.timeTaken))
              ? response.timeTaken.toFixed(1)
              : '—';

          // 1-based index (how many items are already in the list + 1)
          const indexNum = attemptsList.childElementCount + 1;

          attemptItem.innerHTML = `
              <span class="attempt-index">${indexNum}.</span>
              <span class="attempt-word">${response.word}</span>
              <span class="attempt-choice">You: ${chosenLabel}</span>
              <span class="attempt-correct">Correct: ${correctLabel}</span>
              <span class="attempt-result">${response.isCorrect ? '✔' : '✘'}</span>
              <span class="attempt-time">${seconds}s</span>
          `;

          attemptsList.appendChild(attemptItem);
      });

      // Make sure the attempts panel is visible (remove `hidden` and force display:block just in case CSS had display:none)
      attemptsPanel.hidden = false;
      attemptsPanel.style.display = 'block';

      // Beginner-friendly: Scroll the attempts panel into view so desktop users see it immediately.
      attemptsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // Show trophies earned
      const trophies = checkTrophies(score, responses);
      const trophiesSection = document.getElementById('trophies-section');
      const trophiesList = document.getElementById('trophies-list');
      trophiesList.innerHTML = '';

      trophies.forEach((trophy) => {
          const trophyItem = document.createElement('li');
          trophyItem.innerHTML = `<span>${trophy}</span>`;
          trophiesList.appendChild(trophyItem);
      });

      // Beginner-friendly: Always show the trophies section and force it visible in case CSS had display:none
      trophiesSection.hidden = false;
      trophiesSection.style.display = 'block';

      if (trophies.length === 0) {
          // If no trophies earned, show a friendly message
          const noTrophyItem = document.createElement('li');
          noTrophyItem.textContent = "No trophies earned this time. Try again!";
          trophiesList.appendChild(noTrophyItem);
      }
  }

  /* -------------------------------
     5. EVENT LISTENERS (PLAYER INPUT)
  --------------------------------*/

  // When restart button is clicked, restart the game
  restartButton.addEventListener('click', initGame);

  // When left or right button is clicked
  leftButton.addEventListener('click', () => handleResponse('left'));
  rightButton.addEventListener('click', () => handleResponse('right'));

  // Support keyboard arrow keys
  document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') handleResponse('left');
      if (e.key === 'ArrowRight') handleResponse('right');
  });

  // Support swiping on touch screens (like phones)
  let touchStartX = 0, currentX = 0, isDragging = false;

  stimulus.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
      isDragging = true;
      stimulus.style.transition = 'none'; // Stop smooth animation while dragging
  });

  stimulus.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      currentX = e.changedTouches[0].screenX;
      const offset = currentX - touchStartX;
      stimulus.style.transform = `translateX(${offset}px)`; // Word follows your finger
  });

  stimulus.addEventListener('touchend', (e) => {
      if (!isDragging) return;
      isDragging = false;
      const swipeDistance = currentX - touchStartX;

      // If swipe is far enough, count as left or right choice
      if (Math.abs(swipeDistance) > 100) {
          const choice = swipeDistance > 0 ? 'right' : 'left';
          handleResponse(choice);
      } else {
          // Otherwise, snap word back to center
          stimulus.style.transition = 'transform 0.3s ease';
          stimulus.style.transform = 'translateX(0)';
      }
  });

  /* -------------------------------
     6. START THE GAME AUTOMATICALLY
  --------------------------------*/
  initGame(); // Begin when page loads
});