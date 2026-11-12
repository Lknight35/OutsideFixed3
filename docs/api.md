# Outside API contract

Base URL `http://localhost:8787/api`. All JSON responses use `{data: value}`; failures use `{error:{code,message}}`. Dates are ISO 8601 UTC strings. IDs are opaque strings. Send `Authorization: Bearer <token>`. No seed users, footage, activity, or fabricated places. GET health and auth routes are public; all other routes require a session. Lists are arrays unless an object is specified below. Request bodies are JSON except upload. Unknown fields are discarded.

## Shared shapes

```ts
type User = {
  id: string;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
};
type Place = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: string;
  source: "openstreetmap";
  attribution: string;
  distanceMeters?: number;
};
type Video = {
  id: string;
  user: User;
  place: Place;
  caption: string;
  recordedAt: string;
  createdAt: string;
  durationSeconds: number | null;
  status: "processing" | "pending" | "approved" | "rejected" | "failed";
  visibility: "public" | "friends" | "private";
  verification: "location_checked";
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  expiresAt: string;
  failureReason: string | null;
};
type Preferences = {
  friendRequests: boolean;
  friendActivity: boolean;
  invitations: boolean;
  invitationResponses: boolean;
  invitationMessages: boolean;
  outsideSignals: boolean;
  mapVisibility: "friends" | "private";
  interests: string[];
};
type Invitation = {
  id: string;
  organizer: User;
  place: Place;
  startsAt: string;
  endsAt: string;
  note: string;
  createdAt: string;
  myResponse: "organizer" | "pending" | "accepted" | "declined";
  recipients?: { user: User; response: string }[];
  chatExpiresAt: string;
};
type Message = {
  id: string;
  senderId: string;
  text: string;
  place: Place | null;
  createdAt: string;
};
```

Media URLs are relative `/api/videos/:id/media` and `/api/videos/:id/thumbnail`; include the Bearer header on native video/image requests. Media authorization is checked every request, including range requests. A user can always access their own retained approved memories; discovery footage expires after 7 days.

## Account

- `POST /auth/register {email,password,name}` → `{token,user}`. Password 10–128 characters.
- `POST /auth/login {email,password}` → `{token,user}`.
- `POST /auth/logout {}` → `{ok:true}`.
- `POST /me/delete {password}` → `{ok:true}` after password reauthentication. Wrong password returns 403 without revoking the session; an active upload/transcode returns 409 until finished. Success revokes every session, deletes profile/media/private data and removes friendships. Shared invitations retain an anonymous “Deleted account” actor; affected chats become unavailable. Client must show an explicit destructive confirmation and clear its local session only on success.
- `GET /me` → `{user,preferences,entitlements:{advancedUntil:string|null,active:boolean,approvedContributions:number,progress:number,required:3}}`.
- `PATCH /me {name?}` → User.
- `POST /me/avatar` multipart `image` JPEG/PNG/WebP, ≤5 MiB and ≤16 megapixels → User. Server strips metadata and resizes a still image to 256×256 JPEG. `DELETE /me/avatar` → User. `avatarUrl` is a relative authenticated URL; image requests require Bearer authorization like video media.
- `PATCH /me/preferences` partial Preferences → Preferences.
- `GET /users/search?q=<exact email or name prefix>` → User[]. Minimum 3 characters; bounded results.
- `GET /users/:id` → `{user,friendship:'self'|'friends'|'incoming'|'outgoing'|'none',recentPlaces:Place[]}`. Recent places visible only to mutual friends with map sharing enabled.

## Discovery

- `GET /places/search?q=&lat=&lng=` → Place[]. Explicit submitted search, minimum 2 characters. Real OpenStreetMap data through Nominatim, cached and rate limited; provider outage returns 503, never invented results. Optional coordinate proximity.
- `GET /places/:id` → `{place,videos:Video[],nearby:Place[]}`.
- `GET /places/:id/nearby` → Place[]. Locally indexed genuine places, sorted by distance.
- `GET /feed?q=&category=&lat=&lng=&friends=true` → Video[]. Approved, recent, authorized footage only. Optional `q` (1–200 characters) conservatively matches all meaningful whole words against actual captions/place names/addresses/categories, ignoring obvious query fillers such as “show me” and “nearby”. No semantic or live-activity inference: unmatched terms return no videos. Keep these evidence matches separate from provider place search; timestamps always remain visible.
- `GET /videos/:id` → Video.
- `POST /videos/:id/signal {}` → `{ok:true}`. Mutual friends only; notifies poster once, no location tracking.
- `GET /videos/:id/signals` → `{user:User,createdAt:string}[]`, poster only, current mutual friends only. The separate `outsideSignals` notification preference defaults true; friend activity defaults false.
- `POST /reports {videoId,reason}` → `{id}`. Reason 5–1000 characters.

## Friends

- `GET /friends` → `{friends:User[],incoming:{id,user,createdAt}[],outgoing:{id,user,createdAt}[]}`.
- `POST /friends/requests {userId}` → `{id,status:'pending'}`.
- `POST /friends/requests/:id/respond {response:'accepted'|'declined'}` → `{ok:true}`.
- `DELETE /friends/:userId` → `{ok:true}`; revokes friend map/video visibility immediately.

## Invitations / Next Move

- `GET /invitations` → Invitation[]. Organizer sees all recipients. A recipient sees only their own response and the organizer, never other recipients.
- `POST /invitations {placeId,startsAt,endsAt,recipientIds:string[],note?:string}` → Invitation. Future date, end after start, mutual friends only, 1–20 recipients.
- `GET /invitations/:id` → Invitation.
- `POST /invitations/:id/respond {response:'accepted'|'declined'}` → Invitation.
- `GET /invitations/:id/messages?peerId=<recipient ID>` → `{messages:Message[],expiresAt:string}`. Organizer must choose peerId; recipient omits it. Accepted one-to-one thread only, unavailable after end + 24 hours.
- `POST /invitations/:id/messages {peerId?:string,text?:string,placeId?:string}` → Message. Optional genuine place is Next Move sharing. At least text or placeId required.

## Maps, saves, inbox

- `GET /map` and `GET /users/:id/map` → `{places:{place:Place,videos:Video[],hidden:boolean}[],visibility:'friends'|'private'}`. Only self or permitted mutual friend; hidden locations absent entirely for friends.
- `PUT /map/places/:placeId/privacy {hidden:boolean}` → `{ok:true}`. Hiding suppresses all that user's videos at the place from other users, including saved media, feed and direct media access.
- `GET /saves` → `{places:Place[],videos:Video[],searches:{id,query,createdAt}[]}`.
- `POST /saves {kind:'place'|'video'|'search',targetId?:string,query?:string}` → `{ok:true}`.
- `DELETE /saves {kind,targetId?,query?}` → `{ok:true}`.
- `GET /notifications` → `{id,type,title,body,resourceId:string|null,readAt:string|null,createdAt}[]`.
- `POST /notifications/:id/read {}` → `{ok:true}`.

## Native recording

1. Fresh GPS fix from native device; rear camera only. `POST /capture/tickets {placeId,lat,lng,accuracyMeters,locationTimestamp,mocked?:boolean}` → `{id,serverTime,expiresAt,uploadUrl,maxDurationSeconds:60,maxBytes:41943040}`. Requires fix within 30 seconds, accuracy ≤100 m, distance ≤250 m, rejects native mocked flag. Server time starts capture window.
2. Record in-app (no gallery picker), then `POST /capture/tickets/:id/upload` multipart fields `video` (binary), `lat`,`lng`,`accuracyMeters`,`locationTimestamp`,`caption` (optional), `visibility` (`public` default), `cameraFacing` (`back`). Refresh GPS immediately before uploading; freshness is measured at HTTP arrival, allowing slow transfers. → Video with status processing. Upload must start within 10 minutes after ticket creation. Each ticket accepts one clip; retrying a consumed ticket returns the same Video without creating another upload.
3. Poll `GET /videos/:id` for processing → pending review. `GET /me/videos` → all own Videos including failures and moderation status. `POST /videos/:id/retry {}` retries recoverable processing failure.

Approval is a trusted operator action (`npm run moderate -- list` / `approve <id>` / `reject <id> <reason>`), never a user-controlled flag. Only approved quality contributions count. Three unique place/day contributions unlock 30 days, with server-side entitlement calculation. GPS checks and in-app restrictions deter obvious abuse; no cryptographic attestation or foolproof authenticity claim.
