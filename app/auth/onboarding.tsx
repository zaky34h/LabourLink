import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  PanResponder,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { completeOnboarding, deleteAccount } from "../../src/auth/storage";
import { routeForUser } from "../../src/auth/routing";
import { useCurrentUser } from "../../src/auth/useCurrentUser";
import { FormScreen } from "../../src/ui/FormScreen";

const THUMB_SIZE = 64;
const TRACK_INSET = 5;

export default function OnboardingScreen() {
  const { user, loading, reload } = useCurrentUser();
  const [selectedRole, setSelectedRole] = useState<"builder" | "labourer" | null>(null);
  const [sliderWidth, setSliderWidth] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [discarding, setDiscarding] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [about, setAbout] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [pricePerHour, setPricePerHour] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [certifications, setCertifications] = useState<string[]>([""]);
  const [bsb, setBsb] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  const thumbX = useRef(new Animated.Value(0)).current;
  const thumbOffsetRef = useRef(0);
  const dragStartRef = useRef(0);

  const sliderTravel = Math.max(sliderWidth - THUMB_SIZE - TRACK_INSET * 2, 0);

  useEffect(() => {
    const id = thumbX.addListener(({ value }) => {
      thumbOffsetRef.current = value;
    });
    return () => {
      thumbX.removeListener(id);
    };
  }, [thumbX]);

  useEffect(() => {
    if (loading || !user) return;
    if (user.role !== "pending") {
      router.replace(routeForUser(user));
    }
  }, [loading, user]);

  function animateThumbTo(role: "builder" | "labourer") {
    const toValue = role === "labourer" ? 0 : sliderTravel;
    Animated.spring(thumbX, {
      toValue,
      useNativeDriver: false,
      bounciness: 8,
    }).start();
    setSelectedRole(role);
  }

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => sliderTravel > 0,
      onPanResponderGrant: () => {
        dragStartRef.current = thumbOffsetRef.current;
      },
      onPanResponderMove: (_, gestureState) => {
        const next = Math.max(0, Math.min(sliderTravel, dragStartRef.current + gestureState.dx));
        thumbX.setValue(next);
      },
      onPanResponderRelease: (_, gestureState) => {
        const projected = Math.max(0, Math.min(sliderTravel, dragStartRef.current + gestureState.dx));
        animateThumbTo(projected >= sliderTravel / 2 ? "builder" : "labourer");
      },
      onPanResponderTerminate: () => {
        animateThumbTo(selectedRole === "builder" ? "builder" : "labourer");
      },
    })
  ).current;

  function updateCertification(index: number, value: string) {
    setCertifications((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function addCertificationRow() {
    setCertifications((prev) => [...prev, ""]);
  }

  function removeCertificationRow(index: number) {
    setCertifications((prev) => {
      const next = prev.filter((_, currentIndex) => currentIndex !== index);
      return next.length ? next : [""];
    });
  }

  async function onSubmit() {
    if (!selectedRole || submitting || discarding) {
      return Alert.alert("Pick a role", "Slide to choose whether you’re a builder or labourer.");
    }

    if (!firstName.trim() || !lastName.trim() || !about.trim()) {
      return Alert.alert("Missing info", "Please complete your name and short bio.");
    }

    setSubmitting(true);
    try {
      const res =
        selectedRole === "builder"
          ? await completeOnboarding({
              role: "builder",
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              about: about.trim(),
              companyName: companyName.trim(),
              address: address.trim(),
            })
          : await completeOnboarding({
              role: "labourer",
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              about: about.trim(),
              pricePerHour: Number(pricePerHour),
              experienceYears: Number(experienceYears),
              certifications: certifications.map((item) => item.trim()).filter(Boolean),
              bsb: bsb.trim(),
              accountNumber: accountNumber.trim(),
            });

      if (!res.ok) return Alert.alert("Couldn’t finish setup", res.error);

      await reload();
      router.replace(routeForUser(res.user));
    } finally {
      setSubmitting(false);
    }
  }

  function onBackPress() {
    if (submitting || discarding) return;
    void discardPendingAccount();
  }

  async function discardPendingAccount() {
    if (discarding) return;
    setDiscarding(true);
    try {
      const res = await deleteAccount();
      if (!res.ok) {
        return Alert.alert("Couldn’t go back", res.error);
      }
      router.replace("/");
    } finally {
      setDiscarding(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
        <Text style={{ fontSize: 20, fontWeight: "900" }}>No active session</Text>
        <Pressable onPress={() => router.replace("/")} style={{ marginTop: 12 }}>
          <Text style={{ fontWeight: "800" }}>Go to Login</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FormScreen backgroundColor="#FFF8D9">
      <View style={{ flex: 1, backgroundColor: "#FFF8D9", padding: 24, paddingTop: 32, gap: 18 }}>
        <View
          style={{
            position: "absolute",
            top: -40,
            right: -80,
            width: 280,
            height: 280,
            borderRadius: 140,
            backgroundColor: "#FDE047",
            opacity: 0.4,
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: -60,
            left: -60,
            width: 260,
            height: 260,
            borderRadius: 130,
            backgroundColor: "#111111",
            opacity: 0.08,
          }}
        />

        <View style={{ alignItems: "center" }}>
          <Image
            source={require("../../assets/labourlink-logo.png")}
            style={{ width: 220, height: 90 }}
            resizeMode="contain"
          />
          <Text style={{ marginTop: 8, fontSize: 28, fontWeight: "900", color: "#111111" }}>
            Which one are you?
          </Text>
        </View>

        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <RoleCard
              title="Labourer"
              subtitle="Looking for jobs and availability"
              active={selectedRole === "labourer"}
              onPress={() => animateThumbTo("labourer")}
            />
            <RoleCard
              title="Builder"
              subtitle="Hiring crews and posting work"
              active={selectedRole === "builder"}
              onPress={() => animateThumbTo("builder")}
            />
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 8 }}>
            <Text style={{ fontWeight: "800", color: selectedRole === "labourer" ? "#111111" : "#11111188" }}>
              Labourer
            </Text>
            <Text style={{ fontWeight: "800", color: selectedRole === "builder" ? "#111111" : "#11111188" }}>
              Builder
            </Text>
          </View>

          <View
            onLayout={(event) => {
              const width = event.nativeEvent.layout.width;
              setSliderWidth(width);
              if (selectedRole) {
                thumbX.setValue(selectedRole === "labourer" ? 0 : Math.max(width - THUMB_SIZE - TRACK_INSET * 2, 0));
              }
            }}
            style={{
              height: 74,
              borderRadius: 37,
              backgroundColor: "#111111",
              padding: 5,
              justifyContent: "center",
              overflow: "visible",
            }}
          >
            <View
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", opacity: 0.2 }}>
                Slide to choose your side
              </Text>
            </View>
            <Animated.View
              {...panResponder.panHandlers}
              style={{
                width: THUMB_SIZE,
                height: THUMB_SIZE,
                borderRadius: THUMB_SIZE / 2,
                backgroundColor: "#FDE047",
                borderWidth: 2,
                borderColor: "#111111",
                alignItems: "center",
                justifyContent: "center",
                transform: [{ translateX: thumbX }],
              }}
            >
              <View
                style={{
                  width: 28,
                  alignItems: "center",
                  justifyContent: "center",
                  transform: [{ translateX: selectedRole === "builder" ? -1 : 0 }],
                }}
              >
                <Text
                  style={{
                    fontSize: 26,
                    lineHeight: 26,
                    fontWeight: "900",
                    color: "#111111",
                    textAlign: "center",
                    includeFontPadding: false,
                  }}
                >
                  {selectedRole === "builder" ? "B" : "L"}
                </Text>
              </View>
            </Animated.View>
          </View>
        </View>

        <View
          style={{
            borderWidth: 1,
            borderColor: "#111111",
            borderRadius: 22,
            backgroundColor: "#fff",
            padding: 18,
            gap: 14,
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: "900" }}>
            {selectedRole === "labourer"
              ? "Labourer details"
              : selectedRole === "builder"
                ? "Builder details"
                : "Pick your side to continue"}
          </Text>

          {selectedRole ? (
            <>
              <Field label="First Name" value={firstName} onChangeText={setFirstName} />
              <Field label="Last Name" value={lastName} onChangeText={setLastName} />
              <Field label="About Yourself" value={about} onChangeText={setAbout} multiline />

              {selectedRole === "labourer" ? (
                <>
                  <Field
                    label="Rate ($/hr)"
                    value={pricePerHour}
                    onChangeText={setPricePerHour}
                    keyboardType="numeric"
                  />
                  <Field
                    label="Experience (years)"
                    value={experienceYears}
                    onChangeText={setExperienceYears}
                    keyboardType="numeric"
                  />

                  <View style={{ gap: 8 }}>
                    <Text style={{ fontWeight: "700" }}>Certifications</Text>
                    {certifications.map((certification, index) => (
                      <View key={`cert-${index}`} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <TextInput
                          value={certification}
                          onChangeText={(value) => updateCertification(index, value)}
                          placeholder="e.g. White Card"
                          style={{
                            flex: 1,
                            borderWidth: 1,
                            borderColor: "#111111",
                            borderRadius: 10,
                            padding: 14,
                          }}
                        />
                        <Pressable
                          onPress={index === certifications.length - 1 ? addCertificationRow : () => removeCertificationRow(index)}
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 19,
                            borderWidth: 1,
                            borderColor: "#111111",
                            backgroundColor: index === certifications.length - 1 ? "#111111" : "#fff",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text
                            style={{
                              fontWeight: "900",
                              fontSize: 18,
                              color: index === certifications.length - 1 ? "#FDE047" : "#111111",
                            }}
                          >
                            {index === certifications.length - 1 ? "+" : "-"}
                          </Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>

                  <Field label="BSB" value={bsb} onChangeText={setBsb} keyboardType="number-pad" />
                  <Field
                    label="Account Number"
                    value={accountNumber}
                    onChangeText={setAccountNumber}
                    keyboardType="number-pad"
                  />
                </>
              ) : (
                <>
                  <Field label="Company Name" value={companyName} onChangeText={setCompanyName} />
                  <Field label="Address" value={address} onChangeText={setAddress} />
                </>
              )}
            </>
          ) : (
            <Text style={{ lineHeight: 21, opacity: 0.72 }}>
              Move the slider left for labourer or right for builder. The matching setup form will appear here.
            </Text>
          )}

          <Pressable
            onPress={onSubmit}
            disabled={submitting || discarding || !selectedRole}
            style={{
              padding: 16,
              borderRadius: 14,
              backgroundColor: submitting || discarding || !selectedRole ? "#444" : "#111111",
              alignItems: "center",
              marginTop: 6,
            }}
          >
            <Text style={{ color: "#FDE047", fontWeight: "900" }}>
              {submitting ? "Finishing setup..." : "Finish Account Setup"}
            </Text>
          </Pressable>

          <Pressable
            onPress={onBackPress}
            disabled={submitting || discarding}
            style={{
              padding: 14,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "#111111",
              alignItems: "center",
              backgroundColor: "#fff",
              opacity: submitting || discarding ? 0.7 : 1,
            }}
          >
            <Text style={{ fontWeight: "900", color: "#111111" }}>
              {discarding ? "Deleting account..." : "Back"}
            </Text>
          </Pressable>
        </View>
      </View>
    </FormScreen>
  );
}

function RoleCard({
  title,
  subtitle,
  active,
  onPress,
}: {
  title: string;
  subtitle: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: 112,
        borderRadius: 18,
        padding: 16,
        backgroundColor: active ? "#111111" : "#fff8d9",
        borderWidth: 1,
        borderColor: "#111111",
        justifyContent: "space-between",
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: "900", color: active ? "#FDE047" : "#111111" }}>{title}</Text>
      <Text style={{ lineHeight: 19, opacity: active ? 0.9 : 0.72, color: active ? "#fff" : "#111111" }}>
        {subtitle}
      </Text>
    </Pressable>
  );
}

function Field(props: any) {
  const { label, ...rest } = props;
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontWeight: "700" }}>{label}</Text>
      <TextInput
        {...rest}
        style={{
          borderWidth: 1,
          borderColor: "#111111",
          borderRadius: 10,
          padding: 14,
          minHeight: rest.multiline ? 90 : undefined,
          textAlignVertical: rest.multiline ? "top" : "auto",
        }}
      />
    </View>
  );
}
