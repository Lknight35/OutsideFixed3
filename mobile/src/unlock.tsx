import React from "react";
import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Account, Request } from "./types";
import {
  Button,
  colors,
  ErrorBox,
  Icon,
  Loading,
  Screen,
  Section,
  styles,
  useLoad,
} from "./ui";
export function UnlockScreen({
  request,
  initial,
  onRecord,
}: {
  request: Request;
  initial: Account;
  onRecord: () => void;
}) {
  const account = useLoad(() => request<Account>("/me"), [request], initial);
  const earned = account.data.entitlements;
  return (
    <Screen refreshing={account.loading} onRefresh={account.reload}>
      <LinearGradient
        colors={["#351342", "#141019"]}
        style={{
          padding: 26,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: "#5B2970",
          alignItems: "center",
          gap: 17,
        }}
      >
        <View
          style={{
            height: 75,
            width: 75,
            borderRadius: 26,
            backgroundColor: "#6D25844D",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="sparkles-outline" size={35} color="#D99BFF" />
        </View>
        <Text style={[styles.title, { fontSize: 32, textAlign: "center" }]}>
          More Outside.{"\n"}Earned by you.
        </Text>
        <Text style={[styles.body, { textAlign: "center" }]}>
          Useful perspectives make this place better for everyone.
        </Text>
      </LinearGradient>
      {!!account.error && (
        <ErrorBox message={account.error} onRetry={account.reload} />
      )}
      <View style={[styles.card, { gap: 17 }]}>
        <View style={[styles.row, { justifyContent: "space-between" }]}>
          <Text style={{ color: colors.text, fontWeight: "700", fontSize: 19 }}>
            {earned.active ? "Your access is active" : "Your next unlock"}
          </Text>
          <Icon
            name={
              earned.active ? "checkmark-circle-outline" : "lock-open-outline"
            }
            color={earned.active ? colors.green : colors.accent}
          />
        </View>
        {!!(earned.active && earned.advancedUntil) && (
          <Text style={styles.body}>
            Advanced access until{" "}
            {new Date(earned.advancedUntil).toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
            .
          </Text>
        )}
        <View style={{ flexDirection: "row", gap: 9 }}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 7,
                borderRadius: 4,
                backgroundColor:
                  i < earned.progress ? colors.accent : "#3C2748",
              }}
            />
          ))}
        </View>
        <Text style={{ color: "#D3AFE5", fontWeight: "600" }}>
          {earned.progress} / {earned.required} approved quality updates
        </Text>
        <Text style={styles.body}>
          Three approved quality updates unlock 30 days of advanced access. This
          is earned through contributions.
        </Text>
      </View>
      <Section title="Make it worth someone’s trip" />
      {[
        {
          icon: "videocam-outline",
          title: "Be there. Show it.",
          description:
            "Record a clear, useful update in the app at a real place. No camera-roll videos.",
        },
        {
          icon: "shield-checkmark-outline",
          title: "Quality comes first.",
          description:
            "Each update is processed and reviewed. Repeated updates from the same place on the same day do not earn extra credit.",
        },
        {
          icon: "sparkles-outline",
          title: "Your progress stays yours.",
          description:
            "Your progress updates after review. Your profile always shows the current result.",
        },
      ].map((step, index) => (
        <View
          key={index}
          style={[styles.row, { alignItems: "flex-start", gap: 15 }]}
        >
          <View
            style={{
              height: 41,
              width: 41,
              borderRadius: 13,
              backgroundColor: "#281435",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{ color: colors.accent, fontSize: 17, fontWeight: "700" }}
            >
              {index + 1}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            <Text
              style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}
            >
              {step.title}
            </Text>
            <Text style={styles.body}>{step.description}</Text>
          </View>
        </View>
      ))}
      <Button
        title="Share a perspective"
        icon="videocam-outline"
        onPress={onRecord}
      />
      <View style={styles.card}>
        <Text style={{ color: colors.text, fontWeight: "600" }}>
          About advanced features
        </Text>
        <Text style={[styles.muted, { fontSize: 12 }]}>
          Earned access and contribution progress are live in this milestone.
          Advanced recommendation and planning tools are still being developed
          and are not available here yet.
        </Text>
      </View>
    </Screen>
  );
}
