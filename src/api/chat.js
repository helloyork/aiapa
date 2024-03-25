
import readline from 'readline';

class Message {
    constructor({ user, text }) {
        this.user = user;
        this.text = text;
        this.id = 0;
    }
    getText() {
        return this.text;
    }
    setText(text) {
        this.text = text;
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
        this.history = [];
    }
    /**@param {{user: string, text: string}} message */
    addHistory(message) {
        let m = new Message(message).setId(this.id++);
        this.history.push(m);
        return m;
    }
    log(){
        this.history.forEach(m => {
            console.log(m.getUser() + ": " + m.getText());
            console.log("\n");
        });
    }
    refresh() {
        readline.cursorTo(process.stdout, 0, 0);
        readline.clearScreenDown(process.stdout);
        this.log();
    }
}



