const router = require("express").Router();
const {searchProducts} = require("../../controllers/searchService/searchService.controller");
const { protected } = require('../../middleware/user.logout.middleware');

router.get("/",  searchProducts);

module.exports = router;