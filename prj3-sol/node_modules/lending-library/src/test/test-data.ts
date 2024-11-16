import Path from 'path';

import { Errors } from 'cs544-js-utils';
import { readJson } from 'cs544-node-utils';

import { Book } from '../lib/library.js';

import books from './books.js';


const BOOKS = getTestBooks(); 


export { BOOKS, };

//bit messy, but don't want to copy data;
//also, import json requires experimental import assertions
function getTestBooks() {
  return books as Book[];
}
