import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { router, useFocusEffect } from "expo-router";
import { Calendar } from "react-native-calendars";
import { useCurrentUser } from "../../src/auth/useCurrentUser";
import { getUserByEmail, type LabourerUser } from "../../src/auth/storage";
import { getThreadsForUser } from "../../src/chat/storage";
import { createWorkOffer, getOffersForBuilder } from "../../src/offers/storage";
import { getBuilderPayments } from "../../src/payments/storage";
import { getSavedLabourers } from "../../src/saved-labourers/storage";

export default function BuilderHome() {
  const { user } = useCurrentUser();
  const [activeChats, setActiveChats] = useState(0);
  const [pendingOffersCount, setPendingOffersCount] = useState(0);
  const [pendingPayCount, setPendingPayCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [labourers, setLabourers] = useState<LabourerUser[]>([]);
  const [savedLabourersCount, setSavedLabourersCount] = useState(0);
  const [selectedLabourerEmail, setSelectedLabourerEmail] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [finishTime, setFinishTime] = useState("");
  const [rate, setRate] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [sendingOffer, setSendingOffer] = useState(false);
  const [showDatePickerInline, setShowDatePickerInline] = useState(false);
  const [showLabourerDropdownInline, setShowLabourerDropdownInline] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [activeTimeField, setActiveTimeField] = useState<"start" | "finish" | null>(null);
  const [timePickerHour, setTimePickerHour] = useState("7");
  const [timePickerMinute, setTimePickerMinute] = useState("00");
  const [timePickerPeriod, setTimePickerPeriod] = useState<"AM" | "PM">("AM");

  const company = user?.role === "builder" ? user.companyName : "Builder";
  const selectedLabourer = labourers.find((l) => l.email === selectedLabourerEmail);

  function closeOfferOverlays() {
    setOfferModalOpen(false);
    setShowDatePickerInline(false);
    setShowLabourerDropdownInline(false);
    setShowTimePicker(false);
    setActiveTimeField(null);
  }

  async function loadChattedLabourers() {
    if (!user?.email) {
      setLabourers([]);
      setSelectedLabourerEmail("");
      return;
    }

    const threads = await getThreadsForUser(user.email);
    const peers = await Promise.all(threads.map((t) => getUserByEmail(t.peerEmail)));
    const fromChats = peers.filter((peer): peer is LabourerUser => peer?.role === "labourer");

    const deduped = Array.from(
      new Map(fromChats.map((l) => [l.email.toLowerCase(), l])).values()
    );

    setLabourers(deduped);
    if (!selectedLabourerEmail && deduped.length > 0) {
      setSelectedLabourerEmail(deduped[0].email);
    }
  }

  async function loadDashboardData() {
    if (!user?.email) {
      setActiveChats(0);
      setPendingOffersCount(0);
      setPendingPayCount(0);
      setLabourers([]);
      setSelectedLabourerEmail("");
      return;
    }

    const [threads, offers, payments, savedLabourers] = await Promise.all([
      getThreadsForUser(user.email),
      getOffersForBuilder(user.email),
      getBuilderPayments().catch(() => []),
      getSavedLabourers().catch(() => []),
    ]);
    setActiveChats(threads.length);
    setPendingOffersCount(offers.filter((o) => o.status === "pending").length);
    setPendingPayCount(payments.filter((p) => p.status === "pending").length);
    setSavedLabourersCount(savedLabourers.length);
    await loadChattedLabourers();
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }

  function resetOfferForm() {
    setStartDate("");
    setEndDate("");
    setStartTime("");
    setFinishTime("");
    setRate("");
    setEstimatedHours("");
    setSiteAddress("");
    setNotes("");
  }

  function onPickDate(dateString: string) {
    if (!startDate || (startDate && endDate)) {
      setStartDate(dateString);
      setEndDate("");
      return;
    }

    if (dateString < startDate) {
      setEndDate(startDate);
      setStartDate(dateString);
      return;
    }

    setEndDate(dateString);
  }

  function toIsoLocal(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function buildRangeMarkedDates() {
    if (!startDate && !endDate) return {};
    const marks: Record<string, any> = {};

    if (startDate && !endDate) {
      marks[startDate] = { selected: true, color: "#111", textColor: "#FDE047" };
      return marks;
    }
    if (!startDate || !endDate) return marks;

    const cursor = new Date(`${startDate}T00:00:00`);
    const last = new Date(`${endDate}T00:00:00`);
    while (cursor <= last) {
      const iso = toIsoLocal(cursor);
      const isStart = iso === startDate;
      const isEnd = iso === endDate;
      marks[iso] = {
        startingDay: isStart,
        endingDay: isEnd,
        color: "#111",
        textColor: "#FDE047",
      };
      cursor.setDate(cursor.getDate() + 1);
    }
    return marks;
  }

  function parseTimeToMinutes(v: string) {
    const value = v.trim().toLowerCase().replace(/\s+/g, " ");
    const ampmMatch = value.match(/^(\d{1,2}):(\d{2})\s*([ap]m)$/);
    if (ampmMatch) {
      const h = Number(ampmMatch[1]);
      const m = Number(ampmMatch[2]);
      const meridian = ampmMatch[3];
      if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
      if (h < 1 || h > 12 || m < 0 || m > 59) return null;
      const isPm = meridian === "pm";
      const normalizedHour = ((h % 12) + (isPm ? 12 : 0)) % 24;
      return normalizedHour * 60 + m;
    }

    const match = value.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const h = Number(match[1]);
    const m = Number(match[2]);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return h * 60 + m;
  }

  function formatMinutesTo12Hour(minutes: number) {
    const clamped = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
    const hour24 = Math.floor(clamped / 60);
    const minute = String(clamped % 60).padStart(2, "0");
    const isPm = hour24 >= 12;
    const hour12 = hour24 % 12 || 12;
    return `${hour12}:${minute} ${isPm ? "PM" : "AM"}`;
  }

  function toTimePickerParts(minutes: number) {
    const clamped = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
    const hour24 = Math.floor(clamped / 60);
    const minute = String(clamped % 60).padStart(2, "0");
    const period: "AM" | "PM" = hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 % 12 || 12;
    return {
      hour: String(hour12),
      minute,
      period,
    };
  }

  function openTimePicker(field: "start" | "finish") {
    const fallbackMinutes = field === "start" ? 7 * 60 : 15 * 60 + 30;
    const existing = parseTimeToMinutes(field === "start" ? startTime : finishTime);
    const parts = toTimePickerParts(existing === null ? fallbackMinutes : existing);

    setActiveTimeField(field);
    setTimePickerHour(parts.hour);
    setTimePickerMinute(parts.minute);
    setTimePickerPeriod(parts.period);
    setShowTimePicker(true);
  }

  function closeTimePicker() {
    setShowTimePicker(false);
    setActiveTimeField(null);
  }

  function onConfirmTimePicker() {
    if (!activeTimeField) return;
    const hour12 = Number(timePickerHour);
    const minute = Number(timePickerMinute);
    if (!Number.isFinite(hour12) || !Number.isFinite(minute)) {
      return closeTimePicker();
    }

    const hour12Normalized = ((hour12 - 1) % 12) + 1;
    const hour24 =
      timePickerPeriod === "PM" ? (hour12Normalized % 12) + 12 : hour12Normalized % 12;
    const minutes = hour24 * 60 + minute;
    const timeText = formatMinutesTo12Hour(minutes);

    if (activeTimeField === "start") {
      setStartTime(timeText);
    } else {
      setFinishTime(timeText);
    }
    closeTimePicker();
  }

  async function openOfferModal() {
    setOfferModalOpen(true);
    await loadChattedLabourers();
  }

  async function onGenerateOffer() {
    if (!user?.email || user.role !== "builder") return;
    if (labourers.length === 0) {
      return Alert.alert(
        "No chatted labourers",
        "Message a labourer first, then generate a work offer."
      );
    }
    if (!selectedLabourerEmail) {
      return Alert.alert("Missing labourer", "Please select a labourer.");
    }
    const startMinutes = parseTimeToMinutes(startTime);
    const finishMinutes = parseTimeToMinutes(finishTime);
    if (startMinutes === null || finishMinutes === null) {
      return Alert.alert(
        "Invalid time",
        "Use 12-hour format for start and finish times (e.g. 07:00 AM)."
      );
    }
    if (finishMinutes <= startMinutes) {
      return Alert.alert("Invalid time range", "Finish time must be after start time.");
    }
    const calculatedHours = Number(((finishMinutes - startMinutes) / 60).toFixed(2));

    setSendingOffer(true);
    try {
      const res = await createWorkOffer({
        builderEmail: user.email,
        labourerEmail: selectedLabourerEmail,
        startDate: startDate.trim(),
        endDate: endDate.trim(),
        hours: calculatedHours,
        rate: Number(rate),
        estimatedHours: Number(estimatedHours),
        siteAddress: siteAddress.trim(),
        notes: `Shift: ${formatMinutesTo12Hour(startMinutes)} - ${formatMinutesTo12Hour(finishMinutes)}${notes.trim() ? `\n${notes.trim()}` : ""}`,
      });

      if (!res.ok) return Alert.alert("Couldn’t generate offer", res.error);

      closeOfferOverlays();
      resetOfferForm();
      Alert.alert("Work Offer Generated", "Offer sent to the labourer portal.", [
        { text: "View Offers", onPress: () => router.push("/builder/offers") },
        { text: "OK" },
      ]);
    } finally {
      setSendingOffer(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      let isCancelled = false;

      async function runLoad() {
        await loadDashboardData();
        if (isCancelled) return;
      }

      runLoad();
      closeOfferOverlays();

      return () => {
        isCancelled = true;
      };
    }, [user?.email])
  );

  useEffect(() => {
    if (!offerModalOpen) {
      setShowDatePickerInline(false);
      setShowLabourerDropdownInline(false);
    }
  }, [offerModalOpen]);

  return (
    <ScrollView
        style={{ flex: 1, backgroundColor: "#fff" }}
        contentContainerStyle={{ padding: 20, paddingTop: 60, gap: 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
      {/* Header */}
      <View style={{ gap: 6 }}>
        <Text style={{ fontSize: 14, fontWeight: "700", color: "#111111" }}>
          Welcome back,
        </Text>
        <Text style={{ fontSize: 28, fontWeight: "900" }}>{company}</Text>
      </View>

      {/* Stats */}
      <View style={{ flexDirection: "row", gap: 12 }}>
        <StatCard title="Active Chats" value={String(activeChats)} />
        <StatCard title="Pending Offers" value={String(pendingOffersCount)} />
      </View>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <StatCard title="Saved Labourers" value={String(savedLabourersCount)} />
        <StatCard title="Pending Pay" value={String(pendingPayCount)} />
      </View>

      {/* Quick Actions */}
      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: "900" }}>Quick Actions</Text>

        <ActionButton
          label="Browse Labourers"
          subtitle="Find available workers by date"
          tone="yellow"
          onPress={() => {
            closeOfferOverlays();
            router.push("/builder/browse");
          }}
        />

        <ActionButton
          label="Messages"
          subtitle="View conversations with labourers"
          onPress={() => {
            closeOfferOverlays();
            router.push("/builder/messages");
          }}
        />

        <ActionButton
          label="Generate Work Offer"
          subtitle="Send formal offer details to a labourer"
          tone="yellow"
          onPress={openOfferModal}
        />

        <ActionButton
          label="Saved Labourers"
          subtitle="View labourers you’ve starred"
          onPress={() => {
            closeOfferOverlays();
            router.push("/builder/saved");
          }}
        />
      </View>

      <Modal visible={offerModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" }}>
          <View
            style={{
              backgroundColor: "#fff",
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
              padding: 16,
              maxHeight: "88%",
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <Text style={{ fontSize: 18, fontWeight: "900" }}>Generate Work Offer</Text>
              <Pressable
                onPress={() => {
                  closeOfferOverlays();
                }}
              >
                <Text style={{ fontWeight: "900" }}>Close</Text>
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
              contentContainerStyle={{ gap: 10, paddingBottom: 8 }}
            >
              <View style={{ gap: 6 }}>
                <Text style={{ fontWeight: "800" }}>Select Labourer</Text>
                <Pressable
                  onPress={() => {
                    if (labourers.length === 0) {
                      Alert.alert("No chatted labourers", "Message a labourer first.");
                      return;
                    }
                    setShowLabourerDropdownInline((v) => !v);
                  }}
                  style={{
                    borderWidth: 1,
                    borderColor: "#111111",
                    borderRadius: 10,
                    minHeight: 52,
                    justifyContent: "center",
                    paddingHorizontal: 12,
                  }}
                >
                  <View style={{ minHeight: 52, justifyContent: "center", flexDirection: "row", alignItems: "center" }}>
                    <Text style={{ flex: 1, fontWeight: "700", opacity: labourers.length === 0 ? 0.7 : 1 }} numberOfLines={1}>
                      {labourers.length === 0
                        ? "No chatted labourers yet"
                        : selectedLabourer
                          ? `${selectedLabourer.firstName} ${selectedLabourer.lastName}`
                          : "Select labourer"}
                    </Text>
                    <Text style={{ opacity: 0.7 }}>▾</Text>
                  </View>
                </Pressable>

                {showLabourerDropdownInline && labourers.length > 0 ? (
                  <View
                    style={{
                      marginTop: 6,
                      borderWidth: 1,
                      borderColor: "#111111",
                      borderRadius: 10,
                      maxHeight: 200,
                      padding: 8,
                      gap: 8,
                    }}
                  >
                    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                      {labourers.map((l) => {
                        const active = l.email === selectedLabourerEmail;
                        return (
                          <Pressable
                            key={l.email}
                            onPress={() => {
                              setSelectedLabourerEmail(l.email);
                              setShowLabourerDropdownInline(false);
                            }}
                            style={{
                              padding: 10,
                              borderRadius: 10,
                              borderWidth: 1,
                              borderColor: "#111111",
                              marginBottom: 8,
                              backgroundColor: active ? "#111" : "#fff",
                            }}
                          >
                            <Text style={{ fontWeight: "900", color: active ? "#FDE047" : "#111111" }}>
                              {l.firstName} {l.lastName}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : null}
              </View>

              <View style={{ gap: 6 }}>
                <Text style={{ fontWeight: "700" }}>Date Range</Text>
                <Pressable
                  onPress={() => setShowDatePickerInline((v) => !v)}
                  style={{
                    borderWidth: 1,
                    borderColor: "#111111",
                    borderRadius: 10,
                    padding: 12,
                    minHeight: 52,
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontWeight: "700" }}>
                    {startDate && endDate
                      ? `${startDate} to ${endDate}`
                      : startDate
                        ? `${startDate} (select end date)`
                        : "Select start and end dates"}
                  </Text>
                </Pressable>

                {showDatePickerInline ? (
                  <View style={{ marginTop: 6, borderWidth: 1, borderColor: "#111111", borderRadius: 10, padding: 8 }}>
                    <Calendar
                      markingType="period"
                      markedDates={buildRangeMarkedDates()}
                      onDayPress={(day) => onPickDate(day.dateString)}
                    />
                  </View>
                ) : null}
              </View>

              <RowField>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={{ fontWeight: "700" }}>Start Time</Text>
                  <Pressable
                    onPress={() => openTimePicker("start")}
                    style={{
                      borderWidth: 1,
                      borderColor: "#111111",
                      borderRadius: 10,
                      padding: 12,
                      minHeight: 52,
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontWeight: "700" }}>{startTime || "Select start time"}</Text>
                  </Pressable>
                </View>

                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={{ fontWeight: "700" }}>Finish Time</Text>
                  <Pressable
                    onPress={() => openTimePicker("finish")}
                    style={{
                      borderWidth: 1,
                      borderColor: "#111111",
                      borderRadius: 10,
                      padding: 12,
                      minHeight: 52,
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontWeight: "700" }}>{finishTime || "Select finish time"}</Text>
                  </Pressable>
                </View>
              </RowField>

              <InputField
                label="Rate ($/hr)"
                value={rate}
                onChangeText={setRate}
                keyboardType="numeric"
              />

              <InputField
                label="Estimated Hours"
                value={estimatedHours}
                onChangeText={setEstimatedHours}
                keyboardType="numeric"
              />

              <InputField
                label="Site Address"
                value={siteAddress}
                onChangeText={setSiteAddress}
              />

              <InputField
                label="Notes (PPE etc)"
                value={notes}
                onChangeText={setNotes}
                multiline
              />
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
              <Pressable
                onPress={() => {
                  closeOfferOverlays();
                  resetOfferForm();
                }}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: "#111111",
                  borderRadius: 12,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontWeight: "900" }}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={onGenerateOffer}
                disabled={sendingOffer}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: sendingOffer ? "#444444" : "#111",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#FDE047", fontWeight: "900" }}>
                  {sendingOffer ? "Generating..." : "Generate"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showTimePicker} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: "900", marginBottom: 8 }}>
              {activeTimeField === "start" ? "Select Start Time" : "Select Finish Time"}
            </Text>

            <View style={{ flexDirection: "row", gap: 8, height: 180 }}>
              <View style={{ flex: 1, borderWidth: 1, borderColor: "#111111", borderRadius: 10, overflow: "hidden" }}>
                <Picker
                  selectedValue={timePickerHour}
                  onValueChange={(value) => setTimePickerHour(value as string)}
                >
                  {Array.from({ length: 12 }).map((_, i) => {
                    const label = String(i + 1);
                    return (
                      <Picker.Item key={label} label={label} value={label} />
                    );
                  })}
                </Picker>
              </View>

              <View style={{ flex: 1, borderWidth: 1, borderColor: "#111111", borderRadius: 10, overflow: "hidden" }}>
                <Picker
                  selectedValue={timePickerMinute}
                  onValueChange={(value) => setTimePickerMinute(value as string)}
                >
                  {Array.from({ length: 60 }).map((_, i) => {
                    const value = String(i).padStart(2, "0");
                    return <Picker.Item key={value} label={value} value={value} />;
                  })}
                </Picker>
              </View>

              <View style={{ flex: 1, borderWidth: 1, borderColor: "#111111", borderRadius: 10, overflow: "hidden" }}>
                <Picker
                  selectedValue={timePickerPeriod}
                  onValueChange={(value) => setTimePickerPeriod(value as "AM" | "PM")}
                >
                  <Picker.Item label="AM" value="AM" />
                  <Picker.Item label="PM" value="PM" />
                </Picker>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <Pressable
                onPress={closeTimePicker}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: "#111111",
                  borderRadius: 12,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontWeight: "900" }}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={onConfirmTimePicker}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: "#111",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontWeight: "900", color: "#FDE047" }}>Set Time</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

/* ======================
   Components
====================== */

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#fff",
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#111111",
      }}
    >
      <Text style={{ fontSize: 24, fontWeight: "900" }}>{value}</Text>
      <Text style={{ marginTop: 6, opacity: 0.7, fontWeight: "700" }}>
        {title}
      </Text>
    </View>
  );
}

function ActionButton({
  label,
  subtitle,
  onPress,
  disabled,
  tone,
}: {
  label: string;
  subtitle: string;
  onPress?: () => void;
  disabled?: boolean;
  tone?: "default" | "yellow";
}) {
  const isYellow = tone === "yellow" || disabled;

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={{
        backgroundColor: isYellow ? "#FDE047" : "#111",
        padding: 16,
        borderRadius: 16,
      }}
    >
      <Text
        style={{
          color: isYellow ? "#333333" : "#FDE047",
          fontWeight: "900",
          fontSize: 16,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: isYellow ? "#444444" : "#FDE047",
          marginTop: 4,
          fontWeight: "600",
        }}
      >
        {subtitle}
      </Text>
    </Pressable>
  );
}

function InputField(props: any) {
  const { label, ...rest } = props;
  return (
    <View style={{ gap: 6, flex: 1 }}>
      <Text style={{ fontWeight: "700" }}>{label}</Text>
      <TextInput
        {...rest}
        style={{
          borderWidth: 1,
          borderColor: "#111111",
          borderRadius: 10,
          padding: 12,
          minHeight: rest.multiline ? 90 : undefined,
          textAlignVertical: rest.multiline ? "top" : "auto",
        }}
      />
    </View>
  );
}

function RowField({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: "row", gap: 10 }}>{children}</View>;
}
