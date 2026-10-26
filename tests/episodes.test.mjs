import assert from 'node:assert/strict';
import { qualityLabel, thumbnailFileId, validateEpisode } from '../lib/episode-meta.mjs';
for (const [file, label] of [
  [{file_name:'BB.S10.Day21.1080p.mkv'}, '1080p'],
  [{file_name:'video.mkv', quality:'720p'}, '720p'],
  [{file_name:'clip.4K.mp4'}, '2160p'],
  [{file_name:'clip.10800.mp4'}, 'clip.10800.mp4'],
]) assert.equal(qualityLabel(file), label);
assert.equal(thumbnailFileId({files:[{thumbnail:{file_id:'video-thumb'}}]}), 'video-thumb');
assert.equal(thumbnailFileId({thumbnail_file_id:'custom', poster_file_id:'poster', files:[]}), 'custom');
assert.equal(thumbnailFileId({files:[{thumb:{file_id:'legacy-thumb'}}]}), 'legacy-thumb');
assert.equal(thumbnailFileId({files:[]}), '');
const episode = {season:10,episode_key:'day-21-full',kind:'episode',day:21,title:'Day 21',files:[{quality:'720p',file_name:'video.mp4'}]};
assert.equal(validateEpisode(episode), episode);
assert.throws(() => validateEpisode({...episode,season:9}), /season 10/);
assert.throws(() => validateEpisode({...episode,episode_key:''}), /stable/);
assert.throws(() => validateEpisode({...episode,files:[...episode.files,...episode.files]}), /one file per quality/);
assert.throws(() => validateEpisode({...episode,files:[{quality:'auto',file_name:'video.mp4'}]}), /explicit quality/);
assert.throws(() => validateEpisode({...episode,day:2.5}), /integer/);
assert.throws(() => validateEpisode({...episode,kind:'movie'}), /kind/);
assert.throws(() => validateEpisode({...episode,duration_seconds:-1}), /nonnegative/);
console.log('Episode metadata: quality labels, thumbnails, season isolation and import validation passed.');
