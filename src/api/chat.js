
import readline from "readline";
import { Chat } from "./generative.js";

class Message {
    constructor({ user, content }) {
        this.user = user;
        this.content = content;
        this.id = 0;
    }
    getContent() {
        return this.content;
    }
    setContent(content) {
        this.content = content;
        return this;
    }
    getUser() {
        return this.user;
    }
    setId(id) {
        this.id = id;
        return this;
    }
    getId() {
        return this.id;
    }

}

export class ChatApp {
    id = 0;
    /**@param {import("../types").App} app */
    constructor(app) {
        this.app = app;
        /**@type {Message[]} */
        this.history = [];
    }
    /**@param {import("../types").Message} message */
    addHistory(message) {
        let m = new Message(message).setId(this.id++);
        this.history.push(m);
        return m;
    }
    log(){
        this.history.forEach(m => {
            this.app.Logger.tagless(this.app.UI.hex(this.app.UI.Colors.Gray)(m.getUser() + ": ") + this.app.UI.hex(({
                [Chat.Role.USER]: this.app.UI.Colors.Gray,
                [Chat.Role.MODEL]: this.app.UI.Colors.White
            })[m.getUser()])(m.getContent()));
            if(m.getUser() === Chat.Role.MODEL) this.app.Logger.tagless("---\n");
        });
    }
    refresh() {
        console.clear();
        readline.cursorTo(process.stdout, 0, 0);
        readline.clearScreenDown(process.stdout);
        this.log();
    }
    /**@returns {import("../types").Message[]} */
    toData() {
        return this.history.map(m => ({ user: m.getUser(), content: m.getContent() }));
    }
}



