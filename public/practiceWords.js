document.addEventListener('DOMContentLoaded', () => {
    const startPracticeBtn = document.getElementById('startPracticeBtn');
    const filterWordStrength = document.getElementById('filterWordStrength');
    const nextWordBtn = document.getElementById('nextWordBtn');
    const submitPracticeAnswerBtn = document.getElementById('submitPracticeAnswerBtn');
    const practiceFeedback = document.getElementById('practiceFeedback');
    const practiceWordPrompt = document.getElementById('practiceWordPrompt');
    const practiceArea = document.getElementById('practiceArea');
    const filterWordsPrompt = document.getElementById('filterWordsPrompt');

    let filteredWords = [];
    let currentWordIndex = 0;

    // Event listener to start practice:
    startPracticeBtn.addEventListener('click', () => {
        // Get words from localStorage:
        const wordList = JSON.parse(localStorage.getItem('wordList')) || [];

        // Filter words based on selected option:
        filteredWords = filterWords(wordList, filterWordStrength.value);
        currentWordIndex = 0;

        if (filteredWords.length > 0) {
            displayWordToPractice();
            togglePracticeControls(true);
        } else {
            practiceFeedback.textContent = "No words match the selected filter.";
        }
    });

    // Event listener for 'Next Word' button:
    nextWordBtn.addEventListener('click', () => {
        moveToNextWord();
    });

    // Event listener for answer submission:
    submitPracticeAnswerBtn.addEventListener('click', async () => {
        const userAnswer = practiceWordPrompt.value.trim();
        const currentWord = filteredWords[currentWordIndex];

        if (!userAnswer) {
            practiceFeedback.textContent = "Please provide an answer.";
            return;
        }

        // Simulate checking the answer:
        const isCorrect = userAnswer === currentWord.translation; 

        await handleAnswerSubmission(currentWord.word, isCorrect);

        moveToNextWord();
    });

    function moveToNextWord() {
        // Hide feedback after 1.5 seconds and then move to the next word:
        setTimeout(() => {
            currentWordIndex++;
            if (currentWordIndex < filteredWords.length) {
                displayWordToPractice();
            } else {
                practiceFeedback.textContent = "You've practiced all the words in this filter!";
                togglePracticeControls(false);
            }
        }, 1500);
    }

    function displayWordToPractice() {
        const word = filteredWords[currentWordIndex];
        practiceWordPrompt.value = '';
        practiceFeedback.textContent = '';
        document.getElementById('startPracticeWordPrompt').textContent = `Translate the word:`;
        document.getElementById('wordToPractice').textContent = word.word;
    }

    function filterWords(wordList, filterOption) {
        switch (filterOption) {
            case 'time-for-practice':
                return wordList.filter(word => word.strength === 'time-for-practice');
            case 'weak':
                return wordList.filter(word => word.strength === 'weak');
            case 'weak_moderate':
                return wordList.filter(word => word.strength === 'weak' || word.strength === 'moderate');
            case 'moderate':
                return wordList.filter(word => word.strength === 'moderate');
            case 'strong':
                return wordList.filter(word => word.strength === 'strong');
            case 'all':
                return wordList;
            default:
                return wordList;
        }
    }

    function togglePracticeControls(isActive) {
        startPracticeBtn.style.display = isActive ? 'none' : 'inline-block';
        filterWordsPrompt.style.display = isActive ? 'none' : 'block';
        submitPracticeAnswerBtn.style.display = isActive ? 'inline-block' : 'none';
        nextWordBtn.style.display = isActive ? 'inline-block' : 'none';
        practiceArea.style.display = isActive ? 'block' : 'none';
        practiceWordPrompt.style.display = isActive ? 'block' : 'none';
    }

    async function handleAnswerSubmission(wordValue, correct) {
        const wordData = JSON.parse(localStorage.getItem('wordList')).find(word => word.word === wordValue);
        const currentDate = new Date();

        const strength = updateWordStrength(localStorage.getItem('wordStrength'), correct);
        localStorage.setItem('wordStrength', strength);

        if (correct) {
            wordData.strength = updateWordStrength(wordData.strength, true);
            practiceFeedback.textContent = "Correct!";
            practiceFeedback.style.fontWeight = 'bold';
            practiceFeedback.style.color = 'green';
        } else {
            wordData.strength = updateWordStrength(wordData.strength, false);
            practiceFeedback.textContent = `Incorrect. The correct answer was: ${wordData.translation}`;
            practiceFeedback.style.fontWeight = 'bold';
            practiceFeedback.style.color = 'red';
        }
        wordData.lastPracticed = currentDate.toISOString();
        wordData.nextReview = calculateNextReview(wordData.strength, wordData.lastPracticed);

        await updateLocalStorage(wordValue, strength);
        updateUI(wordValue);

        try {
            await fetch('/words', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    originalWord: wordValue,
                    strength: strength,
                    lastPracticed: new Date().toISOString(),
                    nextReview: wordData.nextReview
                })
            });
            console.log('Word list updated successfully');
        } catch (error) {
            console.error('Failed to update word list on the server:', error);
        }
    }

    function updateWordStrength(currentStrength, correct) {
        const strengths = ['time-for-practice', 'weak', 'moderate', 'strong'];
        let index = strengths.indexOf(currentStrength);

        if (correct && index < strengths.length - 1) {
            return strengths[index + 1]; // Improve the strength
        } else if (!correct && index > 0) {
            return strengths[index - 1]; // Lower the strength
        }
        return currentStrength;
    }

    function calculateNextReview(strength, lastPracticed) {
        const intervals = {
            'weak': 1,              // 1 day
            'moderate': 3,          // 3 days
            'strong': 7,            // 7 days
            'time-for-practice': 0  // No interval for immediate practice
        };
        const intervalDays = intervals[strength];
        const lastPracticeDate = new Date(lastPracticed);
        const nextReviewDate = new Date(lastPracticeDate.setDate(lastPracticeDate.getDate() + intervalDays));

        return nextReviewDate.toISOString();
    }

    async function updateLocalStorage(wordValue, strength, nextReview) {
        const wordList = JSON.parse(localStorage.getItem('wordList')) || [];
        const wordIndex = wordList.findIndex(word => word.word === wordValue);

        if (wordIndex !== -1) {
            wordList[wordIndex].strength = strength;
            wordList[wordIndex].nextReview = nextReview;
            localStorage.setItem('wordList', JSON.stringify(wordList));
        }
    }
});

function resetPracticeControls() {
    // Reset initial state:
    document.getElementById('filterWordStrength').value = 'weak_moderate'; // Default filter value
    document.getElementById('practiceWordPrompt').value = ''; // Clear practice input

    document.getElementById('startPracticeBtn').style.display = 'inline-block';
    document.getElementById('filterWordsPrompt').style.display = 'block';

    document.getElementById('submitPracticeAnswerBtn').style.display = 'none';
    document.getElementById('nextWordBtn').style.display = 'none';

    document.getElementById('practiceArea').style.display = 'none';
}

document.querySelectorAll('.modal .modal-backdrop').forEach((backdrop) => {
    backdrop.addEventListener('click', () => {
        const modal = backdrop.closest('.modal');
        if (modal) {
            modal.classList.remove('visible');
            resetPracticeControls();
        }
    });
});