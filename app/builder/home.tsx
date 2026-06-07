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
  StyleSheet,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router, useFocusEffect } from "expo-router";
import { Calendar } from "react-native-calendars";
import { useCurrentUser } from "../../src/auth/useCurrentUser";
import { getUserByEmail, type LabourerUser } from "../../src/auth/storage";
import { getThreadsForUser } from "../../src/chat/storage";
import { createMultipleWorkOffers, getOffersForBuilder } from "../../src/offers/storage";
import { getBuilderPayments } from "../../src/payments/storage";
import { getSavedLabourers } from "../../src/saved-labourers/storage";
import { colors, spacing, radii, fontFamily, fontSize, fontWeight, type } from "../../src/theme";
import Button from "../../src/ui/Button";

export default function BuilderHome() {
  const { user } = useCurrentUser();
  const [activeChats, setActiveChats] = useState(0);
  const [pendingOffersCount, setPendingOffersCount] = useState(0);
  const [pendingPayCount, setPendingPayCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [labourers, setLabourers] = useState<LabourerUser[]>([]);
  const [savedLabourersCount, setSavedLabourersCount] = useState(0);
  const [selectedLabourerEmails, setSelectedLabourerEmails] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [finishTime, setFinishTime] = useState("");
  const [rate, setRate] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [sendingOffer, setSendingOffer] = useState(false);
  const [showDatePickerInline, setShowDatePickerInline] = useState(false);
  const [showLabourerDropdownInline, setShowLabourerDropdownInline] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [activeTimeField, setActiveTimeField] = useState<"start" | "finish" | null>(null);
  const [timePickerDate, setTimePickerDate] = useState(new Date());

  const company = user?.role === "builder" ? user.companyName : "Builder";
  const selectedLabourers = labourers.filter((l) => selectedLabourerEmails.includes(l.email));

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
      setSelectedLabourerEmails([]);
      return;
    }

    const threads = await getThreadsForUser(user.email);
    const peers = await Promise.all(threads.map((t) => getUserByEmail(t.peerEmail)));
    const fromChats = peers.filter((peer): peer is LabourerUser => peer?.role === "labourer");

    const deduped = Array.from(
      new Map(fromChats.map((l) => [l.email.toLowerCase(), l])).values()
    );

    setLabourers(deduped);
    setSelectedLabourerEmails((current) => {
      const validEmails = new Set(deduped.map((labourer) => labourer.email));
      const filtered = current.filter((email) => validEmails.has(email));
      if (filtered.length > 0 || deduped.length === 0) return filtered;
      return [deduped[0].email];
    });
  }

  async function loadDashboardData() {
    if (!user?.email) {
      setActiveChats(0);
      setPendingOffersCount(0);
      setPendingPayCount(0);
      setLabourers([]);
      setSelectedLabourerEmails([]);
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
    setSiteAddress("");
    setNotes("");
    setSelectedLabourerEmails((current) => current.slice(0, 1));
  }

  function getEstimatedHoursValue() {
    const startMinutes = parseTimeToMinutes(startTime);
    const finishMinutes = parseTimeToMinutes(finishTime);
    if (startMinutes === null || finishMinutes === null || finishMinutes <= startMinutes) {
      return "";
    }

    const hoursPerDay = (finishMinutes - startMinutes) / 60;
    let dayCount = 1;

    if (startDate && endDate) {
      const start = new Date(`${startDate}T00:00:00`);
      const end = new Date(`${endDate}T00:00:00`);
      const diffDays = Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
      if (Number.isFinite(diffDays) && diffDays >= 0) {
        dayCount = diffDays + 1;
      }
    } else if (!startDate) {
      return "";
    }

    return String(Number((hoursPerDay * dayCount).toFixed(2)));
  }

  const estimatedHours = getEstimatedHoursValue();
  const estimatedPay =
    estimatedHours && rate.trim()
      ? Number(estimatedHours) * Number(rate)
      : null;

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
      marks[startDate] = { selected: true, color: colors.primary, textColor: colors.onPrimary };
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
        color: colors.primary,
        textColor: colors.onPrimary,
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

  function openTimePicker(field: "start" | "finish") {
    const fallbackMinutes = field === "start" ? 7 * 60 : 15 * 60 + 30;
    const existing = parseTimeToMinutes(field === "start" ? startTime : finishTime);
    const minutes = existing === null ? fallbackMinutes : existing;
    const clamped = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
    const roundedMinutes = Math.round(clamped / 15) * 15;
    const selectedMinutes = roundedMinutes >= 24 * 60 ? 0 : roundedMinutes;

    const nextDate = new Date();
    nextDate.setHours(Math.floor(selectedMinutes / 60));
    nextDate.setMinutes(selectedMinutes % 60);
    nextDate.setSeconds(0, 0);

    setActiveTimeField(field);
    setTimePickerDate(nextDate);
    setShowTimePicker(true);
  }

  function closeTimePicker() {
    setShowTimePicker(false);
    setActiveTimeField(null);
  }

  function onConfirmTimePicker() {
    if (!activeTimeField) return;
    const rawMinutes = timePickerDate.getHours() * 60 + timePickerDate.getMinutes();
    const snappedMinutes = Math.round(rawMinutes / 15) * 15;
    if (!Number.isFinite(snappedMinutes)) return closeTimePicker();

    let normalized = snappedMinutes;
    if (normalized >= 24 * 60) {
      normalized -= 24 * 60;
    }

    const snappedDate = new Date(timePickerDate);
    snappedDate.setHours(Math.floor(normalized / 60));
    snappedDate.setMinutes(normalized % 60);
    snappedDate.setSeconds(0, 0);
    const timeText = formatMinutesTo12Hour(normalized);

    if (activeTimeField === "start") {
      setStartTime(timeText);
    } else {
      setFinishTime(timeText);
    }
    setTimePickerDate(snappedDate);
    closeTimePicker();
  }

  function onTimePickerChange(_: unknown, value?: Date) {
    if (!value) return;
    setTimePickerDate(value);
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
    if (selectedLabourerEmails.length === 0) {
      return Alert.alert("Missing labourer", "Please select at least one labourer.");
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
      const result = await createMultipleWorkOffers(
        selectedLabourerEmails.map((labourerEmail) => ({
          builderEmail: user.email,
          labourerEmail,
          startDate: startDate.trim(),
          endDate: endDate.trim(),
          hours: calculatedHours,
          rate: Number(rate),
          estimatedHours: Number(estimatedHours),
          siteAddress: siteAddress.trim(),
          notes: `Shift: ${formatMinutesTo12Hour(startMinutes)} - ${formatMinutesTo12Hour(finishMinutes)}${notes.trim() ? `\n${notes.trim()}` : ""}`,
        }))
      );

      if (result.created.length === 0) {
        const firstError = result.failed[0]?.error || "Please try again.";
        return Alert.alert("Couldn’t generate offers", firstError);
      }

      closeOfferOverlays();
      resetOfferForm();
      const createdCount = result.created.length;
      const failedCount = result.failed.length;
      const message =
        failedCount > 0
          ? `${createdCount} work ${createdCount === 1 ? "offer was" : "offers were"} sent. ${failedCount} ${failedCount === 1 ? "offer failed" : "offers failed"}.`
          : `${createdCount} work ${createdCount === 1 ? "offer was" : "offers were"} sent to the selected labourer${createdCount === 1 ? "" : "s"}.`;
      Alert.alert(failedCount > 0 ? "Offers Sent With Issues" : "Work Offers Generated", message, [
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
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: spacing.xl, paddingTop: 60, gap: spacing.xl }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
      >
      {/* Header */}
      <View style={{ gap: 6 }}>
        <Text style={{ ...type.secondary, fontWeight: fontWeight.bold }}>
          Welcome back,
        </Text>
        <Text style={type.display} numberOfLines={1}>{company}</Text>
      </View>

      {/* Stats */}
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <StatCard title="Active Chats" value={String(activeChats)} />
        <StatCard title="Pending Offers" value={String(pendingOffersCount)} />
      </View>

      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <StatCard title="Saved Labourers" value={String(savedLabourersCount)} />
        <StatCard title="Pending Pay" value={String(pendingPayCount)} />
      </View>

      {/* Quick Actions */}
      <View style={{ gap: spacing.md }}>
        <Text style={{ ...type.h3, fontWeight: fontWeight.heavy }}>Quick Actions</Text>

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
        <View style={styles.modalOverlay}>
          <View style={[styles.sheet, { maxHeight: "88%" }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm }}>
              <Text style={type.h2}>Generate Work Offer</Text>
              <Pressable
                onPress={() => {
                  closeOfferOverlays();
                }}
              >
                <Text style={{ fontFamily, fontWeight: fontWeight.heavy, color: colors.text }}>Close</Text>
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
              contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.sm }}
            >
              <View style={{ gap: 6 }}>
                <Text style={styles.fieldLabel}>Select Labourers</Text>
                <Pressable
                  onPress={() => {
                    if (labourers.length === 0) {
                      Alert.alert("No chatted labourers", "Message a labourer first.");
                      return;
                    }
                    setShowLabourerDropdownInline((v) => !v);
                  }}
                  style={{
                    backgroundColor: colors.field,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: radii.md,
                    minHeight: 52,
                    justifyContent: "center",
                    paddingHorizontal: 13,
                  }}
                >
                  <View style={{ minHeight: 52, justifyContent: "center", flexDirection: "row", alignItems: "center" }}>
                    <Text
                      style={{
                        flex: 1,
                        fontFamily,
                        fontSize: fontSize.body,
                        fontWeight: fontWeight.bold,
                        color: colors.text,
                        opacity: labourers.length === 0 ? 0.7 : 1,
                      }}
                      numberOfLines={1}
                    >
                      {labourers.length === 0
                        ? "No chatted labourers yet"
                        : selectedLabourers.length === 0
                          ? "Select labourers"
                          : selectedLabourers.length === 1
                            ? `${selectedLabourers[0].firstName} ${selectedLabourers[0].lastName}`
                            : `${selectedLabourers.length} labourers selected`}
                    </Text>
                    <Text style={{ color: colors.textSecondary }}>▾</Text>
                  </View>
                </Pressable>

                {showLabourerDropdownInline && labourers.length > 0 ? (
                  <View
                    style={{
                      marginTop: 6,
                      backgroundColor: colors.field,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: radii.md,
                      maxHeight: 200,
                      padding: spacing.sm,
                      gap: spacing.sm,
                    }}
                  >
                    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                      {labourers.map((l) => {
                        const active = selectedLabourerEmails.includes(l.email);
                        return (
                          <Pressable
                            key={l.email}
                            onPress={() => {
                              setSelectedLabourerEmails((current) =>
                                current.includes(l.email)
                                  ? current.filter((email) => email !== l.email)
                                  : [...current, l.email]
                              );
                            }}
                            style={{
                              padding: spacing.md,
                              borderRadius: radii.md,
                              borderWidth: 1,
                              borderColor: active ? colors.primary : colors.border,
                              marginBottom: spacing.sm,
                              backgroundColor: active ? colors.primary : colors.surface,
                            }}
                          >
                            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                              <View
                                style={{
                                  width: 20,
                                  height: 20,
                                  borderRadius: radii.sm,
                                  borderWidth: 1,
                                  borderColor: active ? colors.onPrimary : colors.border,
                                  backgroundColor: active ? colors.onPrimary : colors.field,
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                {active ? (
                                  <Text style={{ fontFamily, fontSize: fontSize.caption, fontWeight: fontWeight.heavy, color: colors.primary }}>✓</Text>
                                ) : null}
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontFamily, fontWeight: fontWeight.heavy, color: active ? colors.onPrimary : colors.text }}>
                                  {l.firstName} {l.lastName}
                                </Text>
                                <Text style={{ fontFamily, fontSize: fontSize.label, marginTop: 2, color: active ? colors.onPrimary : colors.textSecondary }}>
                                  {l.email}
                                </Text>
                              </View>
                            </View>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : null}
                {selectedLabourers.length > 0 ? (
                  <Text style={{ ...type.secondary }}>
                    A separate work offer will be sent to each selected labourer.
                  </Text>
                ) : null}
              </View>

              <View style={{ gap: 6 }}>
                <Text style={styles.fieldLabel}>Date Range</Text>
                <Pressable
                  onPress={() => setShowDatePickerInline((v) => !v)}
                  style={[styles.input, { minHeight: 52, justifyContent: "center" }]}
                >
                  <Text style={{ fontFamily, fontSize: fontSize.body, fontWeight: fontWeight.bold, color: colors.text }}>
                    {startDate && endDate
                      ? `${startDate} to ${endDate}`
                      : startDate
                        ? `${startDate} (select end date)`
                        : "Select start and end dates"}
                  </Text>
                </Pressable>

                {showDatePickerInline ? (
                  <View style={{ marginTop: 6, backgroundColor: colors.field, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.sm }}>
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
                  <Text style={styles.fieldLabel}>Start Time</Text>
                  <Pressable
                    onPress={() => openTimePicker("start")}
                    style={[styles.input, { minHeight: 52, justifyContent: "center" }]}
                  >
                    <Text style={{ fontFamily, fontSize: fontSize.body, fontWeight: fontWeight.bold, color: startTime ? colors.text : colors.textSecondary }}>
                      {startTime || "Select start time"}
                    </Text>
                  </Pressable>
                </View>

                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={styles.fieldLabel}>Finish Time</Text>
                  <Pressable
                    onPress={() => openTimePicker("finish")}
                    style={[styles.input, { minHeight: 52, justifyContent: "center" }]}
                  >
                    <Text style={{ fontFamily, fontSize: fontSize.body, fontWeight: fontWeight.bold, color: finishTime ? colors.text : colors.textSecondary }}>
                      {finishTime || "Select finish time"}
                    </Text>
                  </Pressable>
                </View>
              </RowField>

              {showTimePicker ? (
                <View
                  style={{
                    marginTop: spacing.xs,
                    backgroundColor: colors.field,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: radii.lg,
                    padding: spacing.md,
                  }}
                >
                  <Text style={{ ...type.h3, fontWeight: fontWeight.heavy, marginBottom: spacing.sm }}>
                    {activeTimeField === "start" ? "Select Start Time" : "Select Finish Time"}
                  </Text>
                  <DateTimePicker
                    value={timePickerDate}
                    mode="time"
                    is24Hour={false}
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    minuteInterval={15}
                    onChange={onTimePickerChange}
                  />
                  <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.md }}>
                    <View style={{ flex: 1 }}>
                      <Button label="Cancel" variant="secondary" onPress={closeTimePicker} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Button label="Done" onPress={onConfirmTimePicker} />
                    </View>
                  </View>
                </View>
              ) : null}

              <InputField
                label="Rate ($/hr)"
                value={rate}
                onChangeText={setRate}
                keyboardType="numeric"
              />

              <InputField
                label="Estimated Hours"
                value={estimatedHours}
                editable={false}
                selectTextOnFocus={false}
                inputStyle={{
                  backgroundColor: colors.surface,
                  color: colors.textSecondary,
                }}
              />

              <InputField
                label="Estimated Pay"
                value={estimatedPay === null || Number.isNaN(estimatedPay) ? "" : `$${estimatedPay.toFixed(2)}`}
                editable={false}
                selectTextOnFocus={false}
                inputStyle={{
                  backgroundColor: colors.surface,
                  color: colors.textSecondary,
                }}
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

            <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Button
                  label="Cancel"
                  variant="secondary"
                  onPress={() => {
                    closeOfferOverlays();
                    resetOfferForm();
                  }}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Button
                  label={sendingOffer ? "Generating..." : selectedLabourerEmails.length > 1 ? "Generate Offers" : "Generate"}
                  onPress={onGenerateOffer}
                  disabled={sendingOffer}
                />
              </View>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
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
        backgroundColor: colors.surface,
        padding: spacing.lg,
        borderRadius: radii.xl,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text style={{ fontFamily, fontSize: fontSize.h1, fontWeight: fontWeight.heavy, color: colors.text }}>
        {value}
      </Text>
      <Text style={{ ...type.secondary, marginTop: 6, fontWeight: fontWeight.bold }}>{title}</Text>
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
  const highlighted = tone === "yellow" || disabled;

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={{
        backgroundColor: highlighted ? colors.primary : colors.surface,
        borderWidth: 1,
        borderColor: highlighted ? colors.primary : colors.border,
        padding: spacing.lg,
        borderRadius: radii.xl,
      }}
    >
      <Text
        style={{
          fontFamily,
          fontSize: fontSize.h3,
          fontWeight: fontWeight.heavy,
          color: highlighted ? colors.onPrimary : colors.text,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontFamily,
          fontSize: fontSize.label,
          fontWeight: fontWeight.medium,
          marginTop: 4,
          color: highlighted ? colors.onPrimary : colors.textSecondary,
          opacity: highlighted ? 0.85 : 1,
        }}
      >
        {subtitle}
      </Text>
    </Pressable>
  );
}

function InputField(props: any) {
  const { label, inputStyle, ...rest } = props;
  return (
    <View style={{ gap: 6, flex: 1 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...rest}
        placeholderTextColor={colors.textSecondary}
        style={{
          ...styles.input,
          minHeight: rest.multiline ? 90 : undefined,
          textAlignVertical: rest.multiline ? "top" : "auto",
          ...(inputStyle || {}),
        }}
      />
    </View>
  );
}

function RowField({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: "row", gap: spacing.md }}>{children}</View>;
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
  },
  fieldLabel: {
    fontFamily,
    fontSize: fontSize.eyebrow,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  input: {
    backgroundColor: colors.field,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontFamily,
    fontSize: fontSize.body,
    color: colors.text,
  },
});
