const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;
const FILE_PATH = path.join(__dirname, "wordList.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // Serve static files

// Endpoint to get the word list:
app.get("/words", (req, res) => {
  fs.readFile(FILE_PATH, "utf8", (err, data) => {
    if (err) return res.status(500).send(err);
    res.json(JSON.parse(data));
  });
});

// Endpoint to add a new word:
app.post("/words", (req, res) => {
  fs.readFile(FILE_PATH, "utf8", (err, data) => {
    if (err) return res.status(500).send(err);
    const wordList = JSON.parse(data);
    wordList.wordList.push(req.body);
    fs.writeFile(FILE_PATH, JSON.stringify(wordList, null, 2), (err) => {
      if (err) return res.status(500).send(err);
      res.status(200).send("Word added");
    });
  });
});

app.put("/words", (req, res) => {
  const { originalWord, newWord, newTranslation, lastEdited, lastPracticed, strength } = req.body;

  // Read the current word list from the file:
  fs.readFile(FILE_PATH, "utf8", (err, data) => {
    if (err) return res.status(500).send(err);
    const wordList = JSON.parse(data).wordList || [];

    // Find the index of the word to be updated:
    const wordIndex = wordList.findIndex((word) => word.word === originalWord);

    if (wordIndex !== -1) {
      // Update the word information:
      if (newWord !== undefined) wordList[wordIndex].word = newWord;
      if (newTranslation !== undefined) wordList[wordIndex].translation = newTranslation;
      if (strength !== undefined) wordList[wordIndex].strength = strength;
      if (lastEdited !== undefined) wordList[wordIndex].lastEdited = lastEdited;
      if (lastPracticed !== undefined) wordList[wordIndex].lastPracticed = lastPracticed;

      // Write the updated word list back to the file:
      fs.writeFile(FILE_PATH, JSON.stringify({ wordList }, null, 2), (err) => {
        if (err) return res.status(500).send(err);
        res.status(200).send("Word updated successfully");
      });
    } else {
      res.status(404).send("Word not found");
    }
  });
});

// Endpoint to delete a word:
app.delete('/words/:word', (req, res) => {
    const wordToDelete = req.params.word;

    fs.readFile(FILE_PATH, 'utf8', (err, data) => {
        if (err) return res.status(500).send(err);
        const wordList = JSON.parse(data).wordList || [];

        const updatedWordList = wordList.filter(word => word.word !== wordToDelete);

        fs.writeFile(FILE_PATH, JSON.stringify({ wordList: updatedWordList }, null, 2), (err) => {
            if (err) return res.status(500).send(err);
            res.status(200).send('Word deleted successfully');
        });
    });
});

// Endpoint to replace all words:
app.post('/words/replace', (req, res) => {
    const newWords = req.body.wordList;
    if (!Array.isArray(newWords)) {
        return res.status(400).json({ error: 'Invalid wordList format.' });
    }
    fs.writeFile(FILE_PATH, JSON.stringify({ wordList: newWords }, null, 2), (err) => {
        if (err) return res.status(500).json({ error: 'Error writing to file' });
        res.status(200).json({ message: 'Word list replaced successfully' });
    });
});

app.post('/words/add', (req, res) => {
    fs.readFile(FILE_PATH, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Error reading file' });
        
        let existingData;
        try {
            existingData = JSON.parse(data);
        } catch (e) {
            return res.status(500).json({ error: 'Error parsing JSON' });
        }
        
        console.log('Existing Data:', existingData); // Log existing data
        
        const existingWordList = existingData.wordList || [];
        const newWords = req.body.wordList || [];
        
        console.log('New Words:', newWords); // Log new words
        
        const updatedWordList = [
            ...existingWordList,
            ...newWords.filter(newWord => 
                !existingWordList.some(existingWord => existingWord.word === newWord.word)
            )
        ];
        
        console.log('Updated Word List:', updatedWordList); // Log updated word list
        
        fs.writeFile(FILE_PATH, JSON.stringify({ wordList: updatedWordList }, null, 2), (err) => {
            if (err) return res.status(500).json({ error: 'Error writing to file' });
            res.status(200).json({ message: 'Words added successfully' });
        });
    });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
