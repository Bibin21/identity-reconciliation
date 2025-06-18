"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleIdentify = void 0;
const contactService_1 = require("../service/contactService");
const contactService = new contactService_1.ContactService();
const handleIdentify = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, phoneNumber } = req.body;
        if (!email && !phoneNumber) {
            res.status(400).json({ error: 'Email or phoneNumber required' });
            return;
        }
        const result = yield contactService.identifyContact(email, phoneNumber === null || phoneNumber === void 0 ? void 0 : phoneNumber.toString());
        res.json({ contact: result });
    }
    catch (error) {
        console.error('Error in handleIdentify:', error);
        next(error);
    }
});
exports.handleIdentify = handleIdentify;
