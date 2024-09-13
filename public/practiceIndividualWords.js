let correctTranslation;
let wordStrength;
let strength;
let lastPracticed;
let lastEdited;

const intervals = {
    weak: 1,      // 1 day
    moderate: 3,  // 3 days
    strong: 7,     // 7 days
    'time-for-practice': 0 // Handle cases where practice is due immediately
};

async function startPractice() {
    const wordValue = document.querySelector('.modal.visible').getAttribute('data-word'); // Get the word from the modal

    // Fetch the word data from the server:
    try {
        const response = await fetch('/words');
        if (!response.ok) {
            throw new Error('Network response was not ok.');
        }
        const data = await response.json();
        const wordData = data.wordList.find(word => word.word === wordValue);

        if (wordData) {
            // Display the word in the practice area:
            document.getElementById('individualWordToPractice').textContent = wordData.word;

            // Store the correct translation, word strength, last practiced, and last edited in variables and localStorage:
            correctTranslation = wordData.translation;
            wordStrength = wordData.strength;
            lastPracticed = wordData.lastPracticed;
            lastEdited = wordData.lastEdited;

            localStorage.setItem('correctTranslation', correctTranslation); 
            localStorage.setItem('wordStrength', wordStrength);
            localStorage.setItem('lastPracticed', lastPracticed);
            localStorage.setItem('lastEdited', lastEdited);

             // Log the values to the console:
             console.log('Word:', wordData.word);
             console.log('Correct Translation:', correctTranslation);
             console.log('Word Strength:', wordStrength);
             console.log('Last Practiced:', lastPracticed);
             console.log('Last Edited:', lastEdited);

            // Hide the "Start Practice" button and initial prompt:
            document.getElementById('startIndividualPracticeBtn').style.display = 'none';
            document.getElementById('practiceIndividualWordPrompt').style.display = 'none';

            // Show the practice area:
            document.getElementById('individualPracticeArea').style.display = 'block';
            document.getElementById('submitPracticeIndividualAnswerBtn').style.display = 'inline-block';

            // Toggle close buttons:
            document.getElementById('closeIndividualModalButton').style.display = 'none';
            document.getElementById('closeIndividualPracticeModalButton').style.display = 'inline-block';

            // Toggle cancel buttons:
            document.getElementById('cancelIndividualWord').style.display = 'none';
            document.getElementById('cancelIndividualPracticeWord').style.display = 'inline-block';
        } else {
            console.error('Word not found');
        }
    } catch (error) {
        console.error('Error fetching words:', error);
    }
}

document.getElementById('startIndividualPracticeBtn').addEventListener('click', () => {
    // Read the word from the modal:
    const modal = document.querySelector('.modal.visible');
    const word = modal ? modal.getAttribute('data-word') : '';

    if (word) {
        startPractice(word);
    }
});

async function updateWordList(wordValue, newStrength) {
    // Fetch the current word list from localStorage:
    let wordList = JSON.parse(localStorage.getItem('wordList')) || [];

    // Find the word and update its strength:
    wordList = wordList.map(word => {
        if (word.word === wordValue) {
            return { ...word, strength: newStrength, lastPracticed: new Date().toISOString() };
        }
        return word;
    });

    // Save the updated word list back to localStorage:
    localStorage.setItem('wordList', JSON.stringify(wordList));

    try {
        const response = await fetch('/words/update', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            word: wordValue,
            wordStrength: wordStrength,
            lastEdited: new Date().toISOString(),
            lastPracticed: new Date().toISOString()
        })
    });

    if (!response.ok) {
        throw new Error(`Failed to update wordList: ${response.statusText}`);
    }

    console.log('Word list updated successfully');
    } catch (error) {
        console.error('Error updating word list:', error);
    }
}

function getStrengthFromDaysOverdue(daysOverdue) {
    if (daysOverdue <= 0) return 'strong';
    if (daysOverdue === 1) return 'moderate';
    return 'weak';
}

function updateWordStrengthBasedOnOverdue(wordData) {
    const now = Math.floor(Date.now() / 1000);
    const lastPracticedDate = new Date(wordData.lastPracticed).getTime() / 1000;
    const daysOverdue = Math.floor((now - lastPracticedDate) / 86400);

    if (daysOverdue > 0) {
        // Adjust strength based on overdue days:
        const newStrength = getStrengthFromDaysOverdue(daysOverdue);
        return newStrength;
    }
    return wordData.strength;
}


// Call this function when updating word strength:
async function handleAnswerSubmission(correct) {
    const wordElement = document.querySelector('.modal.visible');
    if (!wordElement) {
        console.error('Modal is not visible.');
        return;
    }

    // Ensure wordValue is defined:
    const wordValue = document.querySelector('.modal.visible').getAttribute('data-word');
    
    if (!wordValue) {
        console.error('Word value is not defined.');
        return;
    }

    // Update the word strength:
    strength = updateWordStrength(localStorage.getItem('wordStrength'), correct);
    localStorage.setItem('wordStrength', strength);

    // Calculate the next review date:
    const reviewInterval = intervals[strength];
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + reviewInterval);

    await updateLocalStorage(wordValue, strength, nextReviewDate);

    // Update UI immediately:
    updateUI(wordValue);

    // Send updated data to the server:
    try {
        await fetch('/words', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                originalWord: wordValue, // Use the word to identify which entry to update
                strength: strength,
                lastPracticed: new Date().toISOString(),
                nextReviewDate: new Date(Date.now() + calculateNextReviewInterval(strength) * 1000).toISOString()
            })
        });
        console.log('Word list updated successfully');
    } catch (error) {
        console.error('Failed to update word list on the server:', error);
    }
}

async function updateLocalStorage(wordValue, newStrength, nextReviewDate) {
    // Fetch the current word list from localStorage:
    let wordList = JSON.parse(localStorage.getItem('wordList')) || [];

    // Find the word and update its strength:
    wordList = wordList.map(word => {
        if (word.word === wordValue) {
            return { ...word, strength: newStrength, lastPracticed: new Date().toISOString(), nextReviewDate: nextReviewDate };
        }
        return word;
    });

    // Save the updated word list back to localStorage:
    localStorage.setItem('wordList', JSON.stringify(wordList));
}

function updateUI(wordValue) {
    // Fetch the updated word list from localStorage:
    const wordList = JSON.parse(localStorage.getItem('wordList')) || [];

    // Find the updated word data:
    const wordData = wordList.find(word => word.word === wordValue);

    if (wordData) {
        // Find the table row that contains the word:
        const rows = document.querySelectorAll('tr');
        rows.forEach(row => {
            const wordCell = row.querySelector('td:nth-child(1)');
            if (wordCell && wordCell.textContent === wordValue) {
                const strengthCell = row.querySelector('td:nth-child(2)');
                if (strengthCell) {
                    // Update the strength cell class and text content:
                    strengthCell.textContent = wordData.strength;
                    strengthCell.className = wordData.strength;
                }
                const lastPracticedCell = row.querySelector('td:nth-child(5)');
                if (lastPracticedCell) {
                    // Update the lastPracticed cell content:
                    lastPracticedCell.textContent = new Date(wordData.lastPracticed).toLocaleDateString();
                }
                const nextReviewCell = row.querySelector('td:nth-child(6)');
                if (nextReviewCell) {
                    nextReviewCell.textContent = wordData.nextReviewDate ? new Date(wordData.nextReviewDate).toLocaleDateString() : 'N/A';
                }
            }
        });
    }
}

function calculateNextReviewInterval(strength) {
    switch (strength) {
        case 'strong': return 86400; // 1 day in seconds
        case 'moderate': return 172800; // 2 days in seconds
        case 'time-for-practice': return 259200; // 3 days in seconds
        case 'weak': return 345600; // 4 days in seconds
        default: return 86400; // Default to 1 day
    }
}

// Function to handle answer submission:
document.getElementById('submitPracticeIndividualAnswerBtn').addEventListener('click', () => {
    // Get the user's answer
    const userAnswer = document.getElementById('practiceIndividualAnswer').value.trim();

    // Retrieve the translation from localStorage:
    const storedTranslation = localStorage.getItem('correctTranslation');
    const wordValue = document.querySelector('.modal.visible').getAttribute('data-word');

    // Check if the correctTranslation is null or undefined:
    if (!storedTranslation) {
        console.error('No correct translation found.');
        document.getElementById('practiceIndividualFeedback').textContent = 'An error occurred. Please try again.';
        document.getElementById('practiceIndividualFeedback').style.color = 'red';
        return;
    }

    // Check if the user's answer is correct:
    if (userAnswer.toLowerCase() === storedTranslation.toLowerCase()) {
        document.getElementById('practiceIndividualFeedback').textContent = 'Correct!';
        document.getElementById('practiceIndividualFeedback').style.fontWeight = 'bold';
        document.getElementById('practiceIndividualFeedback').style.color = 'green';

        setTimeout(() => {
            document.getElementById('practiceIndividualFeedback').textContent = '';
        }, 1500);

        // Update wordStrength to a higher level:
        handleAnswerSubmission(true);
    } else {
        document.getElementById('practiceIndividualFeedback').textContent = `Incorrect! The correct translation is: ${correctTranslation}`;
        document.getElementById('practiceIndividualFeedback').style.fontWeight = 'bold';
        document.getElementById('practiceIndividualFeedback').style.color = 'red';

        setTimeout(() => {
            document.getElementById('practiceIndividualFeedback').textContent = '';
        }, 1500);

        // Update wordStrength to a lower level:
        handleAnswerSubmission(false);
    }

    // Clear the input field for the next answer:
    document.getElementById('practiceIndividualAnswer').value = '';
});

// Function to update wordStrength:
function updateWordStrength(currentStrength, correct) {
    const strengthLevels = ['time-for-practice', 'weak', 'moderate', 'strong'];
    let currentIndex = strengthLevels.indexOf(currentStrength);

    if (correct) {
        // Move to the next level if correct, but not beyond 'strong':
        currentIndex = Math.min(currentIndex + 1, strengthLevels.length - 1);
    } else {
        // Move to the previous level if incorrect, but not beyond 'weak':
        currentIndex = Math.max(currentIndex - 1, 0);
    }

    return strengthLevels[currentIndex];
}

function openIndividualModal(modalId, word) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('visible');

        // Store the word in a hidden input or a data attribute:
        modal.setAttribute('data-word', word);
    }
}

// Close individual practice modal:
function closePracticeModal() {
    // Reset initial state:
    document.getElementById('startIndividualPracticeBtn').style.display = 'inline-block';
    document.getElementById('practiceIndividualWordPrompt').style.display = 'inline-block';

    // Hide practice area and reset display of buttons:
    document.getElementById('individualPracticeArea').style.display = 'none';
    document.getElementById('submitPracticeIndividualAnswerBtn').style.display = 'none';

    // Toggle close buttons:
    document.getElementById('closeIndividualModalButton').style.display = 'inline-block';
    document.getElementById('closeIndividualPracticeModalButton').style.display = 'none';

    // Toggle cancel buttons:
    document.getElementById('cancelIndividualWord').style.display = 'inline-block';
    document.getElementById('cancelIndividualPracticeWord').style.display = 'none';
}

// Event listeners for clicking outside the modal content to close the modal:
document.querySelectorAll('.modal .modal-backdrop').forEach((backdrop) => {
    backdrop.addEventListener('click', (event) => {
        const modal = backdrop.closest('.modal');
        if (modal) {
            modal.classList.remove('visible');
            closePracticeModal();
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    // Update UI for any currently visible modals or initial load:
    const modal = document.querySelector('.modal.visible');
    if (modal) {
        const word = modal.getAttribute('data-word');
        updateUI(word);
    }
});