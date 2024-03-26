import { InputContent } from "@google/generative-ai";

export interface Message {
    user: string,
    content: string,
}

export interface Chat {
    name: string;
    id: string;
    history: Message[];
}

export interface ChatHistory {
    history: Chat[];
}

