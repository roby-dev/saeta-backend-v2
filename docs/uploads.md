# Uploads Module (File & Avatar Storage)

The Uploads module handles user profile avatar uploads, validation, and retrieval, decoupling media storage through a Hexagonal Port/Adapter pattern (`StorageService`).

## Architecture Boundaries

- **`domain`**:
  - `UploadedFile` and `UploadResult` contracts.
  - `StorageService` port contract and `STORAGE_SERVICE` injection token.
- **`application`**:
  - CQRS Commands: `UploadAvatarCommand`.
  - CQRS Handlers: `UploadAvatarHandler` (validates file extensions, checks ownership/admin permission, coordinates previous file cleanup, and updates `UserRepository`).
- **`infrastructure`**:
  - `LocalStorageService` saving files safely to disk (`./uploads/`) with unique `UUID` filenames.
  - Pluggable design allowing easy swap to S3/Cloudinary or remote drive providers.
- **`presentation`**:
  - `UploadsController` exposing `/v1/uploads`.
  - `PUT /v1/uploads/:id`: Multipart form-data image upload.
  - `GET /v1/uploads/:photo`: Serves local images statically or redirects to remote storage / fallback image.

---

## HTTP Contract (`/v1/uploads`)

### Upload User Avatar
`PUT /v1/uploads/:id`
- Protected: Authenticated user (`JwtAuthGuard`).
- Authorization: Resource owner (`id === token.sub`) or `ADMIN`.
- Content-Type: `multipart/form-data` with field `image`.
- Validation:
  - Allowed extensions: `png`, `jpg`, `jpeg`, `gif`, `webp`.
  - Max file size: 5 MB.
- Returns: `{ ok: true, user: UserEntity }`.

### Get / Serve Avatar
`GET /v1/uploads/:photo`
- Public: Accessible without token.
- Behavior:
  - If `photo === 'no-image'`: Redirects to the default avatar placeholder.
  - If local file exists: Serves file directly.
  - Otherwise: Redirects to remote file URL (e.g. Google Drive legacy files).
