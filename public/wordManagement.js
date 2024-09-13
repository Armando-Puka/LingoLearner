// Function to handle adding new words:
document.getElementById('saveWordBtn').addEventListener('click', () => {
    const newWord = document.getElementById('newWord').value.trim();
    const newTranslation = document.getElementById('newTranslation').value.trim();

    if (newWord === "" || newTranslation === "") {
        alert("Please enter both a word and its translation.");
        return;
    }

    const wordObject = {
        word: newWord,
        translation: newTranslation,
        strength: 'strong',  // Default strength for new words
        dateAdded: new Date().toISOString().split('T')[0],
        lastEdited: 'N/A',
        lastPracticed: 'N/A'
    };

    addWordToTable(wordObject);
    saveWordToLocalStorage(wordObject);
    saveWordToServer(wordObject);

    // Clear input fields and close modal:
    document.getElementById('newWord').value = '';
    document.getElementById('newTranslation').value = '';
});

function addWordToTable(wordObject) {
    const table = document.querySelector('table tbody');
    const existingRow = Array.from(table.rows).find(row => row.cells[0].textContent === wordObject.word);

    if (existingRow) {
        existingRow.cells[1].textContent = wordObject.strength;
        existingRow.cells[4].textContent = wordObject.lastPracticed;
    } else {
        const newRow = document.createElement('tr');
        newRow.innerHTML = `
            <td>${wordObject.word}</td>
            <td class="${wordObject.strength}">${wordObject.strength}</td>
            <td>${wordObject.dateAdded}</td>
            <td>${wordObject.lastEdited}</td>
            <td>${wordObject.lastPracticed ? new Date(wordObject.lastPracticed).toLocaleDateString() : 'N/A'}</td>
            <td>${wordObject.nextReviewDate ? new Date(wordObject.nextReviewDate).toLocaleDateString() : 'N/A'}</td>
            <td class="option-buttons">
                <button type="button" id="editBtn" onclick="openEditModal('${wordObject.word}', '${wordObject.translation}')">Edit</button>
                <button type="button" id="deleteBtn" onclick="deleteWord('${wordObject.word}')">Delete</button>
                <button type="button" id="practiceWordBtn" data-word="${wordObject.word}" onclick='openIndividualModal("practiceWordModal", "${wordObject.word}")'>Practice Word</button>
            </td>
        `;
        table.appendChild(newRow);
    }
}

// Function to open the edit modal:
function openEditModal(word, translation) {
    // Open the modal:
    openModal('editModal');

    // Set the input fields with the current word and translation:
    document.getElementById('editWord').value = word;
    document.getElementById('editTranslation').value = translation;

    // Store the original word in a hidden field to identify it later:
    document.getElementById('editModal').setAttribute('data-original-word', word);
}

// Function to save the edited word:
document.getElementById('saveEditBtn').addEventListener('click', () => {
    const originalWord = document.getElementById('editModal').getAttribute('data-original-word');
    const newWord = document.getElementById('editWord').value.trim();
    const newTranslation = document.getElementById('editTranslation').value.trim();

    if (newWord === "" || newTranslation === "") {
        alert("Please enter both a word and its translation.");
        return;
    }

    // Update localStorage:
    updateWordInLocalStorage(originalWord, newWord, newTranslation);

    // Update server:
    updateWordOnServer(originalWord, newWord, newTranslation);

    // Close the modal:
    closeModal('editModal');
});

// Function to update a word in localStorage:
function updateWordInLocalStorage(originalWord, newWord, newTranslation) {
    let words = JSON.parse(localStorage.getItem('wordList')) || [];
    
    const wordIndex = words.findIndex(word => word.word === originalWord);
    
    if (wordIndex !== -1) {
        words[wordIndex].word = newWord;
        words[wordIndex].translation = newTranslation;
        words[wordIndex].lastEdited = new Date().toISOString().split('T')[0];
    }
    
    localStorage.setItem('wordList', JSON.stringify(words));
    
    // Refresh the table to reflect changes:
    loadWordsFromLocalStorage();
}

// Function to update a word on the server:
async function updateWordOnServer(originalWord, newWord, newTranslation) {
    const wordObject = {
        originalWord: originalWord,
        newWord: newWord,
        newTranslation: newTranslation,
        lastEdited: new Date().toISOString().split('T')[0]
    };

    try {
        const response = await fetch('http://localhost:3000/words', {
            method: 'PUT',  // Using PUT method for updating
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(wordObject)
        });

        if (response.ok) {
            console.log('Word updated successfully');
        } else {
            console.error('Failed to update word');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Function to handle word deletion:
function deleteWord(wordToDelete) {
    if (!confirm(`Are you sure you want to delete the word: "${wordToDelete}"?`)) {
        return;
    }

    // Find and remove the row from the table:
    const table = document.querySelector('table tbody');
    const rowToDelete = Array.from(table.rows).find(row => row.cells[0].textContent === wordToDelete);
    if (rowToDelete) {
        table.removeChild(rowToDelete);
    }

    // Remove the word from local storage:
    let words = JSON.parse(localStorage.getItem('wordList')) || [];
    words = words.filter(word => word.word !== wordToDelete);
    localStorage.setItem('wordList', JSON.stringify(words));

    // Remove the word from the server:
    fetch(`http://localhost:3000/words/${encodeURIComponent(wordToDelete)}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (response.ok) {
            console.log('Word deleted successfully from the server');
        } else {
            console.error('Failed to delete word from the server');
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

document.getElementById('exportWordsBtn').addEventListener('click', () => {
    fetch('http://localhost:3000/words')
        .then(response => response.json())
        .then(data => {
            const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'wordList.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        })
        .catch(error => {
            console.error('Error fetching words:', error);
        });
});

document.getElementById('fetchWordsBtn').addEventListener('click', () => {
    document.getElementById('fileInput').click(); // Trigger file input click
});

// Function to handle the file input change event:
document.getElementById('fileInput').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/json') {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const uploadedData = JSON.parse(e.target.result);
                if (!uploadedData.wordList) {
                    throw new Error('Invalid file format: No wordList found');
                }

                // Prompt user for action:
                const action = prompt("Type 'replace' to replace existing words or 'add' to add new words:");
                
                if (action === null) {
                    // User pressed cancel:
                    return;
                }
                
                const formattedAction = action.trim().toLowerCase();
                
                if (formattedAction === 'replace') {
                    replaceWords(uploadedData.wordList);
                } else if (formattedAction === 'add') {
                    addWords(uploadedData.wordList);
                } else {
                    alert('Invalid action. Please type "replace" or "add".');
                }
            } catch (error) {
                alert('Failed to parse the JSON file: ' + error.message);
                console.error('Error parsing file:', error);
            }
        };
        reader.readAsText(file);
    } else {
        alert('Please select a valid JSON file.');
    }
});

// Function to replace words in localStorage and on the server:
function replaceWords(newWordList) {
    // Update localStorage:
    localStorage.setItem('wordList', JSON.stringify(newWordList));

    // Update server:
    fetch('http://localhost:3000/words/replace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wordList: newWordList })
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message || 'Words replaced successfully');
        loadWordsFromLocalStorage(); // Refresh the UI
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error replacing words');
    });
}

function addWords(newWords) {
    let existingWords = JSON.parse(localStorage.getItem('wordList')) || [];
    existingWords = existingWords.concat(newWords);

    // Update localStorage:
    localStorage.setItem('wordList', JSON.stringify(existingWords));

    // Update server:
    fetch('http://localhost:3000/words/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wordList: newWords })
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message || 'Words added successfully');
        loadWordsFromLocalStorage(); // Refresh the UI
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error adding words');
    });
}

// Function to save a word to localStorage:
function saveWordToLocalStorage(wordObject) {
    let words = JSON.parse(localStorage.getItem('wordList')) || [];
    words.push(wordObject);
    localStorage.setItem('wordList', JSON.stringify(words));
}

// Function to save a word to the server:
async function saveWordToServer(wordObject) {
    try {
        const response = await fetch('http://localhost:3000/words', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(wordObject)
        });
        if (response.ok) {
            console.log('Word saved successfully');
        } else {
            console.error('Failed to save word');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Function to load words from localStorage and render them in the table:
function loadWordsFromLocalStorage() {
    const wordList = JSON.parse(localStorage.getItem('wordList')) || [];
    const tableBody = document.querySelector('table tbody');

    // Clear existing table rows:
    tableBody.innerHTML = '';

    wordList.forEach(word => {
        addWordToTable(word);
    });
}

// Call the function to load and display words when the page loads:
document.addEventListener('DOMContentLoaded', loadWordsFromLocalStorage);