/**
 * Re-exports from consolidated lib/thingspeak. Use lib/thingspeak for new code.
 */
export {
    thingSpeakService,
    ThingSpeakService,
    fetchFeeds,
    buildFilterParams,
    type ThingSpeakFeed,
    type ThingSpeakChannel,
    type ThingSpeakResponse,
} from '../lib/thingspeak';
