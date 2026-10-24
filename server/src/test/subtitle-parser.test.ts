import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseTimestampToSeconds,
  cleanSubtitleLine,
  parseSubtitles,
} from '../utils/subtitle-parser';

test('parseTimestampToSeconds handles SRT and VTT formats', () => {
  assert.equal(parseTimestampToSeconds('00:01:30,500'), 90.5);
  assert.equal(parseTimestampToSeconds('00:02:15.250'), 135.25);
  assert.equal(parseTimestampToSeconds('01:10.000'), 70);
  assert.equal(parseTimestampToSeconds('invalid'), 0);
});

test('cleanSubtitleLine strips tags and unescapes entities', () => {
  assert.equal(
    cleanSubtitleLine('<i>Hello</i> <b>world</b>!'),
    'Hello world!'
  );
  assert.equal(
    cleanSubtitleLine('<v Sarah>Can you hear me?</v>'),
    'Can you hear me?'
  );
  assert.equal(
    cleanSubtitleLine('It&apos;s a &quot;great&quot; day &amp; sunny'),
    'It\'s a "great" day & sunny'
  );
});

test('parseSubtitles parses standard SRT correctly', () => {
  const sampleSRT = `1
00:00:01,000 --> 00:00:04,500
Good morning everyone.

2
00:00:05,000 --> 00:00:08,200
Today we are going to talk about <i>phrasal verbs</i>.

3
00:00:09,100 --> 00:00:12,000
Please turn in your assignments.`;

  const parsed = parseSubtitles(sampleSRT);
  assert.equal(parsed.cues.length, 3);
  assert.equal(parsed.cues[0].text, 'Good morning everyone.');
  assert.equal(parsed.cues[1].text, 'Today we are going to talk about phrasal verbs.');
  assert.equal(parsed.cues[2].text, 'Please turn in your assignments.');
  assert.match(parsed.fullText, /Good morning everyone.*phrasal verbs.*assignments/);
  assert.ok(parsed.stats.totalWords > 10);
});

test('parseSubtitles parses WebVTT correctly, skipping headers', () => {
  const sampleVTT = `WEBVTT
Kind: captions
Language: en

NOTE This is a commentary note

00:00:01.000 --> 00:00:03.500 align:start position:10%
<v John>Look up the word in the dictionary.</v>

00:00:04.000 --> 00:00:07.000
<v Mary>I already did that!</v>`;

  const parsed = parseSubtitles(sampleVTT);
  assert.equal(parsed.cues.length, 2);
  assert.equal(parsed.cues[0].text, 'Look up the word in the dictionary.');
  assert.equal(parsed.cues[1].text, 'I already did that!');
});

test('parseSubtitles handles empty or whitespace input gracefully', () => {
  const empty = parseSubtitles('   ');
  assert.equal(empty.cues.length, 0);
  assert.equal(empty.fullText, '');
  assert.equal(empty.stats.totalWords, 0);
});

test('parseSubtitles parses plain text dialogue gracefully without timestamps', () => {
  const plainText = `Dr. Watson: Where have you been, Holmes? We have been waiting for hours.
Sherlock: I was investigating the mysterious footprints outside the manor. It seems someone broke in right before midnight.`;

  const parsed = parseSubtitles(plainText);
  assert.ok(parsed.cues.length >= 2);
  assert.ok(parsed.stats.totalWords >= 25);
  assert.equal(parsed.cues[0].id, 1);
  assert.ok(parsed.cues[0].startTime.length > 0);
  assert.ok(parsed.cues[0].endTime.length > 0);
  assert.match(parsed.fullText, /Where have you been, Holmes/);
  assert.match(parsed.fullText, /mysterious footprints/);
});

