
import Natural from "natural";

const { TfIdf, SentenceTokenizer, WordTokenizer, JaroWinklerDistance } = Natural;

export class TfIdfAnalyze {
    constructor() {
        this.tfidf = new TfIdf();
        this.sentenceTokenizer = new SentenceTokenizer();
        this.wordTokenizer = new WordTokenizer();
        this.documents = [];
    }
    addDocument(doc) {
        this.tfidf.addDocument(doc);
        this.documents.push(doc);
    }
    addDocuments(docs) {
        if (Array.isArray(docs)) {
            docs.forEach(doc => {
                this.addDocument(doc);
            });
        }
    }
    listTerms(docIndex) {
        return this.tfidf.listTerms(docIndex);
    }
    listAllTerms() {
        return this.documents.map((_, index) => {
            return this.tfidf.listTerms(index);
        });
    }
    tfidfs(terms, callback) {
        this.tfidf.tfidfs(terms, callback);
    }
    tokenizeSentence(sentence) {
        return this.sentenceTokenizer.tokenize(sentence);
    }
    tokenizeWord(word) {
        return this.wordTokenizer.tokenize(word);
    }
    getSentenceTfidfScore(sentence, docIndex) {
        const words = this.tokenizeWord(sentence);
        let sentenceScore = words.reduce((acc, word) => {
            const tfidf = this.tfidf.tfidf(word, docIndex);
            return acc + tfidf;
        }, 0);
        const averageScore = sentenceScore / words.length;
        return averageScore;
    }
    getSentenceSimilarity(sentence1, sentence2) {
        return JaroWinklerDistance(sentence1, sentence2);
    }
    getParagraphSentenceScores() {
        return this.documents.map((doc, docIndex) => {
            const sentences = this.tokenizeSentence(doc);
            const strongSentences = sentences.map(sentence => {
                const score = this.getSentenceTfidfScore(sentence, docIndex);
                return { sentence, score };
            });
            strongSentences.sort((a, b) => b.score - a.score);
            return strongSentences;
        });
    }
    filterSimilarSentences(sentences, threshold = 0.7) {
        let uniqueSentences = [];
        for (let i = 0; i < sentences.length; i++) {
            let isSimilar = false;
            for (let j = 0; j < uniqueSentences.length; j++) {
                if (this.getSentenceSimilarity(sentences[i], uniqueSentences[j]) > threshold) {
                    isSimilar = true;
                    break;
                }
            }
            if (!isSimilar) {
                uniqueSentences.push(sentences[i]);
            }
        }
        return uniqueSentences;
    }
}




// let time = Date.now();

// const tfa = new TfIdfAnalyze();
// tfa.addDocument("This is a shockingly terrible computer.  The look and feel is extremely cheap.  The thing felt incredibly flimsy, and the entire keyboard could be pushed in without much effort.  Awkward feeling keyboard feel and layout too.  The screen quality was awful.  If you weren't looking at the exact perfect angle, the screen would appear faded out and the color would change.  It has an extremely narrow range of viewing angles.  I could never adjust my eyes to the color, and photos would look simply terrible.  My Chromebook has vastly superior color rendering, and the screen looks good at a wide range of viewing angles.  The resolution was purported to be 1080, but the pixels seemed very large and most things appeared \"blocky\".  But the worst part of this computer was the performance.  Unbelievably slow!  Web pages would take forever to load, text would come in, and a bunch of white boxes would appear on screen until each image would load.  It is not my connection either, as I ran this computer right next to my Chromebook, which had none of these loading problems.  This computer was so slow that it would literally hang up while I was typing!  I would start to type a sentence, and nothing would happen on screen, then a few seconds later, the words would start to show up.  I closed everything but one web browser to compose an email, and I could not write simple text without the computer lagging behind.  It was beyond terrible to the point I may have just gotten a lemon.  But if this was not a broken machine, it's the worst computer I have ever used.  Returned it less than a week after using, I was fed up!");
// tfa.addDocument("I’ve had several HP laptops.  This is the first time I’ve had an issue with any HP product It was fine at first but then the issues started . I bought from a private seller on Amazon has many issues. It doesn’t keep time and day correctly. It doesn’t update correctly all the time it shuts off after a couple minutes, many tries for it to come back on.");
// tfa.addDocument("With the removal of S Mode. First I was able to sign into my Microsoft account, receive the S Mode turn off switch, took an hour to set everything up, downloaded Chrome Browser along with the APP needed, I bought this basic HP Laptop because my PC was not Coded for APP, only Windows could work this particular APP. Also, I played Solitaire, typed with Microsoft Word just fine. I knew with the RAM only at 4 that it would be half the speed to do tasks compared to what I am used to 8 RAM but it is not real noticeable, however, I do wait a little as expected, but no worries!");
// console.log(tfa.tfidf.documents)
// tfa.listAllTerms().forEach((item, index) => {
//     console.log("---\nDocument:", index);
//     console.log(item.map(term => term.term).join(" "));
//     // .sort((a, b) => a.tfidf - b.tfidf)
// });



// let sentences = [];
// tfa.getParagraphSentenceScores().forEach((item, index) => {
//     console.log("---\nDocument:", index);
//     console.log(item.sort((a,b)=> b.score - a.score).slice(0, 8).map(v=>(`${v.score}: ${v.sentence}`)).join("\n"));
//     sentences.push(...item.sort((a,b)=> b.score - a.score).slice(0, 8).map(v=>v.sentence));
// });
// console.log("\n\n===");
// sentences.forEach((item, index) => {
//     console.log(item);
// });
// console.log("\n\n===");
// tfa.filterSimilarSentences(sentences).forEach((item, index) => {
//     console.log(item);
// });



// tfa.listTerms(0).forEach(item => {
//     console.log(item.term, item.tfidf);
// });

// console.log("Time taken:", (Date.now() - time) / 1000, "ms");


