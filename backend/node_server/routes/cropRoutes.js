const express = require('express');
const router = express.Router();
const { createCrop } = require('../controllers/cropController');

router.post('/create', createCrop);

module.exports = router;