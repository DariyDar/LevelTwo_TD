// GlucoDefense — Level 4: "Week Under Stress"

import { food } from './foodData.js';

export const level4 = {
  id: 4,
  name: 'Week Under Stress',
  description: 'Degradation carries over. Manage stress eating.',
  mineCount: 10,

  // 5 foods available (stress eating — comfort food + some healthy)
  availableFoods: ['chocolate', 'fries', 'stew', 'yogurt', 'rice'],

  interventions: {
    exercise: true,
    semaglutide: { charges: 1 },
    dapagliflozin: { charges: 1 },
    metformin: { charges: 1 },
  },

  waves: [
    {
      time: '07:00',
      choices: [
        { foods: [food('eggs'), food('broccoli')] },
        { foods: [food('oatmeal')] },
        { foods: [food('cereal'), food('banana')] },
        { foods: [food('muffin'), food('cola')] },
      ],
    },
    {
      time: '10:00',
      choices: [
        { foods: [food('cheese'), food('salad')] },
        { foods: [food('apple'), food('yogurt')] },
        { foods: [food('sandwich'), food('milk')] },
        { foods: [food('chocolate'), food('cookie')] },
      ],
    },
    {
      time: '13:00',
      choices: [
        { foods: [food('fish'), food('veggies')] },
        { foods: [food('rice'), food('chicken')] },
        { foods: [food('pasta')] },
        { foods: [food('fries'), food('cola')] },
      ],
    },
    {
      time: '16:00',
      choices: [
        { foods: [food('broccoli'), food('cheese')] },
        { foods: [food('apple'), food('yogurt')] },
        { foods: [food('banana'), food('bread')] },
        { foods: [food('donut'), food('chocolate')] },
      ],
    },
    {
      time: '20:00',
      choices: [
        { foods: [food('chicken'), food('salad')] },
        { foods: [food('stew'), food('bread')] },
        { foods: [food('pasta'), food('banana')] },
        { foods: [food('pizza'), food('cola')] },
      ],
    },
  ],
};
