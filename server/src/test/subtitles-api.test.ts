import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSubtitles } from '../utils/subtitle-parser';

test('Subtitles parser correctly extracts clean dialogue from movie SRT snippet', () => {
  const movieSRT = `1
00:01:10,200 --> 00:01:13,400
We have to <b>figure out</b> what happened last night.

2
00:01:14,000 --> 00:01:17,500
Don't worry, it's a <i>piece of cake</i>.

3
00:01:18,100 --> 00:01:22,800
The situation is exceedingly complex and perilous.`;

  const result = parseSubtitles(movieSRT);

  assert.equal(result.cues.length, 3);
  assert.equal(result.cues[0].text, 'We have to figure out what happened last night.');
  assert.equal(result.cues[1].text, "Don't worry, it's a piece of cake.");
  assert.equal(result.cues[2].text, 'The situation is exceedingly complex and perilous.');
  assert.ok(result.stats.totalWords >= 15);
  assert.ok(result.fullText.includes('figure out'));
  assert.ok(result.fullText.includes('piece of cake'));
});

test('Subtitles parser handles cue timestamp calculation accurately', () => {
  const srt = `1
00:00:10,000 --> 00:00:15,500
Hello world.`;
  const result = parseSubtitles(srt);
  assert.equal(result.cues[0].startSeconds, 10);
  assert.equal(result.cues[0].endSeconds, 15.5);
});
