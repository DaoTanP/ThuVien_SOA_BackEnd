const express = require('express');
const router = express.Router();
const UserModel = require('../models/user');
const BookModel = require('../models/book');
const LibraryCardModel = require('../models/libraryCard');
const { userExists, getUserByUsername } = require('../middlewares/user');
const { verifyToken, generateToken } = require('../middlewares/auth');
const { uploadImages, setStorageDirectory, setFileName } = require('../middlewares/file');

setStorageDirectory('./public/images/user');

router.post('/login', async (req, res) => {
    try {
        const username = req.body.username;
        const password = req.body.password;
        let query = {};
        if (username)
            query.username = new RegExp('^' + username + '$');
        if (password)
            query.password = new RegExp('^' + password + '$');

        if (Object.keys(query).length === 0)
            query = undefined;

        const result = await UserModel.findOne(query);
        if (result !== null) {
            const accessToken = generateToken(username);

            res.json({
                accessToken
            });

            // fileService => khi user upload anh avatar, dat ten file la id cua user
            setFileName(result._id.toString());
        }
        else
            res.status(404).json({ message: 'User not found!' });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

router.post('/register', userExists, async (req, res) => {
    if (req.userExists) {
        res.status(400).json({ message: "Account with username " + req.body.username + " already exists" });
        return;
    }

    const user = new UserModel({
        username: req.body.username,
        password: req.body.password,
        displayName: req.body.displayName || undefined,
        role: req.body.role
    });
    try {
        const nUser = await user.save();
        if (!nUser.displayName)
            nUser.displayName = 'user_' + nUser._id.toString();
        const newUser = await nUser.save();

        const accessToken = generateToken(newUser.username);
        res.json({
            accessToken
        });

        // fileService => khi user upload anh avatar, dat ten file la id cua user
        setFileName(newUser._id.toString());
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.post('/usernameAvailable', userExists, async (req, res) => {
    if (req.userExists) {
        res.status(400).json({ message: 'Username ' + req.body.username + ' already exists' });
        return;
    }

    res.status(200).json({ message: 'Username ' + req.body.username + ' is available' });
});

router.use(verifyToken);
router.use(getUserByUsername);

router.route('/')
    .get((req, res) => {
        req.user.avatar = req.protocol + "://" + req.hostname + ':3000/public/images/user/' + req.user.avatar;
        req.password = '';
        res.json(req.user);
    })
    .patch(uploadImages.single('file'), async (req, res) => {
        const user = req.user;

        const fieldsToUpdate = req.body;

        if (req.file) {
            // const filePath = req.protocol + "://" + req.hostname + ':3000/public/' + req.file.filename;
            // fieldsToUpdate.avatar = filePath;
            fieldsToUpdate.avatar = req.file.filename;
        }

        try {
            const result = await user.updateOne(fieldsToUpdate);

            res.json(result);
        } catch (error) {
            res.status(400).json({ message: error.message })
        }
    })
    .delete(async (req, res) => {
        try {
            const user = req.user;
            await user.deleteOne();
            res.json({ message: "Deleted user with username: " + user.username });
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    });

router.post('/addFavorite', async (req, res) => {
    try {
        const user = req.user;
        const book = await BookModel.findById(req.body.bookId);
        if (!book) {
            res.status(404).json({ message: 'Book not found' });
            return;
        }

        if (user.favorite.indexOf(req.body.bookId) === -1)
            user.favorite.push(req.body.bookId);

        user.save();

        res.status(200).json({ message: 'Added to favorite' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.post('/removeFavorite', async (req, res) => {
    try {
        const user = req.user;
        if (user.favorite.length < 1 || user.favorite.indexOf(req.body.bookId) === -1) {
            res.status(400).json({ message: 'Book has not been added to favorite' });
            return;
        }

        user.favorite.splice(user.favorite.indexOf(req.body.bookId), 1);
        user.save();

        res.status(200).json({ message: 'Removed from favorite' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.post('/isFavorite', async (req, res) => {
    try {
        const user = req.user;
        if (!user.favorite || user.favorite.indexOf(req.body.bookId) === -1) {
            res.send(false);
            return;
        }
        res.send(true);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.get('/favorite', async (req, res) => {
    try {
        const favoriteBookIds = req.user.favorite;
        const favoriteBooks = [];
        await Promise.all(favoriteBookIds.map(async id => {
            const book = await BookModel.findById(id);
            favoriteBooks.push(book);
        }));
        favoriteBooks.forEach(book => {
            book.images = book.images.map(image => req.protocol + "://" + req.hostname + ':3000/public/images/book/' + image);
        });
        res.json(favoriteBooks);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.post('/libraryCard', async (req, res) => {
    try {
        const user = req.user;
        const cardId = req.body.cardId;
        const cardPassword = req.body.cardPassword;
        const checkLinkedCard = await UserModel.findOne({ cardId: cardId });

        if (checkLinkedCard) {
            res.status(400).json({ message: 'This card is already linked to an account' });
            return;
        }

        let query = {};
        if (cardId)
            query._id = cardId;
        if (cardPassword)
            query.password = new RegExp('^' + cardPassword + '$');

        if (Object.keys(query).length === 0)
            query = undefined;

        const result = await LibraryCardModel.findOne(query);
        if (!result) {
            res.status(404).json({ message: 'Library card not found!' });
            return;
        }

        user.cardId = cardId;
        user.save();
        res.status(200).json({ message: 'Library card linked!' });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

router.delete('/libraryCard', async (req, res) => {
    try {
        const user = req.user;
        if (user.cardId) {
            user.cardId = null;
            user.save();
        }
        res.status(200).json({ message: 'Library card unlinked!' });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

module.exports = router;