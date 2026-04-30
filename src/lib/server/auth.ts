import { FRC_USERNAME, FRC_TOKEN, FTC_USERNAME, FTC_TOKEN } from '$env/static/private';
import { Buffer } from 'buffer';

export function frcAuth() {
  if (!FRC_USERNAME || !FRC_TOKEN) {
    throw new Error("Missing FRC credentials");
  }

  return Buffer.from(`${FRC_USERNAME}:${FRC_TOKEN}`).toString('base64');
}

export function ftcAuth() {
  if (!FTC_USERNAME || !FTC_TOKEN) {
    throw new Error("Missing FTC credentials");
  }

  return Buffer.from(`${FTC_USERNAME}:${FTC_TOKEN}`).toString('base64');
}