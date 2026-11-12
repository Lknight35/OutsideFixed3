import React, { useContext, useState } from "react";
import { Platform, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Request, User } from "./types";
import { Button, ErrorBox, MediaContext, styles } from "./ui";
export function AvatarEditor({
  request,
  user,
  onUser,
}: {
  request: Request;
  user: User;
  onUser: (user: User) => void;
}) {
  const { apiUrl, token } = useContext(MediaContext);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function pick() {
    setError("");
    setBusy(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
        selectionLimit: 1,
      });
      if (result.canceled) return;
      const image = result.assets[0];
      if (!image) throw new Error("No profile photo was selected.");
      if (image.fileSize && image.fileSize > 5 * 1024 * 1024)
        throw new Error("Choose a photo smaller than 5 MB.");
      const mime =
        image.mimeType ||
        (/\.png$/i.test(image.uri) ? "image/png" : "image/jpeg");
      if (!["image/jpeg", "image/png", "image/webp"].includes(mime))
        throw new Error(
          "Choose a JPEG, PNG, or WebP image for your profile photo.",
        );
      let status: number;
      let payload: { data?: User; error?: { message?: string } };
      if (Platform.OS === "web") {
        const form = new FormData();
        const blob = await fetch(image.uri).then((r) => r.blob());
        form.append("image", blob, image.fileName || "profile.jpg");
        const response = await fetch(`${apiUrl}/me/avatar`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        });
        status = response.status;
        payload = await response.json();
      } else {
        const response = await FileSystem.uploadAsync(
          `${apiUrl}/me/avatar`,
          image.uri,
          {
            httpMethod: "POST",
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            fieldName: "image",
            mimeType: mime,
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        status = response.status;
        try {
          payload = JSON.parse(response.body);
        } catch {
          throw new Error("The server returned an unreadable response.");
        }
      }
      if (status < 200 || status >= 300 || !payload.data)
        throw new Error(
          payload.error?.message ||
            "Your photo could not be uploaded. Try again.",
        );
      onUser(payload.data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not update your profile photo.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    setError("");
    try {
      onUser(await request<User>("/me/avatar", "DELETE"));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not remove your profile photo.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Button
            title={
              user.avatarUrl ? "Change profile photo" : "Add profile photo"
            }
            icon="image-outline"
            variant="secondary"
            small
            onPress={() => void pick()}
            loading={busy}
          />
        </View>
        {!!user.avatarUrl && (
          <Button
            title="Remove"
            variant="ghost"
            small
            disabled={busy}
            onPress={() => void remove()}
          />
        )}
      </View>
      {!!error && <ErrorBox message={error} />}
      <Text style={[styles.muted, { fontSize: 11 }]}>
        Profile photos only. Place updates always use the in-app rear camera.
      </Text>
    </View>
  );
}
