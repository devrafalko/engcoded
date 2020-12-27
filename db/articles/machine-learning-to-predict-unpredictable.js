
import { w, header, paragraph, list } from './../utils/utils.js';

export default {
  title: "Here's How Scientists Are Using Machine Learning To Predict The Unpredictable",
  type: 'article',
  id: '538e54sgk4r9a4gs',
  thumbnail: '538e56jgk4r9a6be',
  header: `Here's how scientists are using machine learning to predict the unpredictable.`,
  author: { name: 'Ashley Hamer' },
  link: { name: 'Curiosity', url: 'https://curiosity.com/topics/heres-how-scientists-are-using-machine-learning-to-predict-the-unpredictable-curiosity/' },
  text: [
    paragraph(`You've probably heard of the butterfly effect, the idea that tiny changes (like a butterfly flapping its wings in Brazil) can have massive consequences (like triggering a tornado in Texas). More than just a poetic metaphor, the butterfly effect says that there are some things that even the most advanced science can never predict. Well, that list of things just got a lot shorter. Scientists from the University of Maryland have used machine learning to predict chaos.`),
    header(`Reservoir Cogs`),
    paragraph(`Generally when scientists want to make predictions about chaotic systems like weather systems or the stock market, they measure as much as they can about it as accurately as they can, create a computer model, then see what that model does next. But in a series of papers published at the turn of 2018 in Physical Review Letters and Chaos, chaos theorist Edward Ott and his colleagues took a different approach. They used a machine-learning algorithm called reservoir computing to repeatedly measure, predict, test, and fine-tune those predictions about a chaotic system until they were as accurate as possible.`),
    paragraph(`The algorithm was tasked with predicting how a wall of flame would behave as it moved through a combustible medium like a sheet of paper. The technical term for it is the Kuramoto-Sivashinsky equation, which is also used to study things like plasma waves and air turbulence. The solution to the equation evolves just like a flame front would, and the scientists fed data from that known evolution into their algorithm — things like the height of the flames at a handful of points along the front at many different moments in time.`),
    paragraph(`With every bit of data input, artificial neurons in the machine-learning network fire signals. The scientists measured the signal strengths of several neurons (or "reservoirs") chosen at random, then weighted and combined them in different ways to produce a set number of outputs. The algorithm then compared these sets of outputs (in this case, predicted flame heights) with the next inputs (actual flame heights). It then made tiny adjustments to the weights of those signals to improve their accuracy for the next measurement. Like a butcher cutting one-pound steaks, every measurement and subsequent adjustment gets the algorithm closer to nailing it on the next try. Finally, you use all of that to make a real prediction about how the system will behave.`),
    paragraph(`The algorithm successfully predicted the future evolution of that flame wall roughly eight times further ahead than any other method ever could. To do that with a model, writes Natalie Wolchover in Quanta, "you'd have to measure a typical system's initial conditions 100,000,000 times more accurately to predict its future evolution eight times further ahead."`),
    header(`It's Something Unpredictable, But in the End It's Right`),
    paragraph(`This is especially big because so many things are so hard to model. There's no equation to describe a whole lot of chaotic systems, and it's really difficult to make grand, complex models of those systems. But if you can use machine learning to simply measure behavior in chunks and fine tune your predictions on the fly, that opens up a world of possibilities.`),
    paragraph(`What possibilities? Think weather forecasts, tsunami predictions, earthquake warnings. You might be able to monitor heart rhythm for impending heart attacks and neuron firing patterns for impending seizures. You could even monitor the sun to get advance warning about devastating solar storms. We might be able to combine this new approach with existing modeling techniques to get even better predictions. "What we should do is use the good knowledge that we have where we have it," Ott told Quanta, "and if we have ignorance we should use the machine learning to fill in the gaps where the ignorance resides."`),
  ],
  words: [
    { index: 0, id: '', meaning: [] },
    { index: 1, id: '', meaning: [] },
    { index: 2, id: '', meaning: [] },
    { index: 3, id: '', meaning: [] },
    { index: 4, id: '', meaning: [] },
    { index: 5, id: '', meaning: [] },
    { index: 6, id: '', meaning: [] },
    { index: 7, id: '', meaning: [] },
    { index: 8, id: '', meaning: [] },
    { index: 9, id: '', meaning: [] },
    { index: 10, id: '', meaning: [] },
    { index: 11, id: '', meaning: [] },
    { index: 12, id: '', meaning: [] },
    { index: 13, id: '', meaning: [] },
    { index: 14, id: '', meaning: [] },
    { index: 15, id: '', meaning: [] },
    { index: 16, id: '', meaning: [] },
    { index: 17, id: '', meaning: [] },
    { index: 18, id: '', meaning: [] },
    { index: 19, id: '', meaning: [] },
    { index: 20, id: '', meaning: [] },
    { index: 21, id: '', meaning: [] },
    { index: 22, id: '', meaning: [] },
    { index: 23, id: '', meaning: [] },
    { index: 24, id: '', meaning: [] },
    { index: 25, id: '', meaning: [] },
    { index: 26, id: '', meaning: [] },
    { index: 27, id: '', meaning: [] },
    { index: 28, id: '', meaning: [] },
    { index: 29, id: '', meaning: [] },
    { index: 30, id: '', meaning: [] },
    { index: 31, id: '', meaning: [] },
    { index: 32, id: '', meaning: [] },
    { index: 33, id: '', meaning: [] },
    { index: 34, id: '', meaning: [] },
    { index: 35, id: '', meaning: [] },
    { index: 36, id: '', meaning: [] },
    { index: 37, id: '', meaning: [] },
    { index: 38, id: '', meaning: [] },
    { index: 39, id: '', meaning: [] },
    { index: 40, id: '', meaning: [] },
    { index: 41, id: '', meaning: [] },
    { index: 42, id: '', meaning: [] },
    { index: 43, id: '', meaning: [] },
    { index: 44, id: '', meaning: [] },
    { index: 45, id: '', meaning: [] },
    { index: 46, id: '', meaning: [] },
    { index: 47, id: '', meaning: [] },
    { index: 48, id: '', meaning: [] },
    { index: 49, id: '', meaning: [] },
    { index: 50, id: '', meaning: [] },
    { index: 51, id: '', meaning: [] },
    { index: 52, id: '', meaning: [] },
    { index: 53, id: '', meaning: [] },
    { index: 54, id: '', meaning: [] },
    { index: 55, id: '', meaning: [] },
    { index: 56, id: '', meaning: [] },
    { index: 57, id: '', meaning: [] },
    { index: 58, id: '', meaning: [] },
    { index: 59, id: '', meaning: [] },
    { index: 60, id: '', meaning: [] },
    { index: 61, id: '', meaning: [] },
    { index: 62, id: '', meaning: [] },
    { index: 63, id: '', meaning: [] },
    { index: 64, id: '', meaning: [] },
    { index: 65, id: '', meaning: [] },
    { index: 66, id: '', meaning: [] },
    { index: 67, id: '', meaning: [] },
    { index: 68, id: '', meaning: [] },
    { index: 69, id: '', meaning: [] },
    { index: 70, id: '', meaning: [] },
    { index: 71, id: '', meaning: [] },
    { index: 72, id: '', meaning: [] },
    { index: 73, id: '', meaning: [] },
    { index: 74, id: '', meaning: [] },
    { index: 75, id: '', meaning: [] },
    { index: 76, id: '', meaning: [] },
    { index: 77, id: '', meaning: [] },
    { index: 78, id: '', meaning: [] },
    { index: 79, id: '', meaning: [] },
    { index: 80, id: '', meaning: [] },
    { index: 81, id: '', meaning: [] },
    { index: 82, id: '', meaning: [] },
    { index: 83, id: '', meaning: [] },
    { index: 84, id: '', meaning: [] },
    { index: 85, id: '', meaning: [] },
    { index: 86, id: '', meaning: [] },
    { index: 87, id: '', meaning: [] },
    { index: 88, id: '', meaning: [] },
    { index: 89, id: '', meaning: [] },
    { index: 90, id: '', meaning: [] },
    { index: 91, id: '', meaning: [] },
    { index: 92, id: '', meaning: [] },
    { index: 93, id: '', meaning: [] },
    { index: 94, id: '', meaning: [] },
    { index: 95, id: '', meaning: [] },
    { index: 96, id: '', meaning: [] },
    { index: 97, id: '', meaning: [] },
    { index: 98, id: '', meaning: [] },
    { index: 99, id: '', meaning: [] },
    { index: 100, id: '', meaning: [] },
    { index: 101, id: '', meaning: [] },
    { index: 102, id: '', meaning: [] },
    { index: 103, id: '', meaning: [] },
    { index: 104, id: '', meaning: [] },
  ]
};