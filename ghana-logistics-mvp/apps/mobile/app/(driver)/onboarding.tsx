import { useEffect, useMemo, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View
} from "react-native";
import { router } from "expo-router";
import { AppButton } from "@/components/AppButton";
import { ScreenContainer } from "@/components/ScreenContainer";
import { ACCRA_MUNICIPALITIES } from "@/constants/municipalities";
import { TRUCK_TYPE_OPTIONS } from "@/constants/trucks";
import { useAuthSession } from "@/hooks/useAuthSession";
import { getDriverOnboardingProgress, submitDriverOnboarding } from "@/lib/driverOnboarding";
import { darkTheme, lightTheme } from "@/theme/colors";
import type { DriverOnboardingProgress, TruckType } from "@/types/domain";

type UploadAsset = {
  uri: string;
  mimeType: string;
  extension: string;
};

export default function DriverOnboardingScreen() {
  const { session } = useAuthSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState<DriverOnboardingProgress | null>(null);
  const [municipality, setMunicipality] = useState<string>(ACCRA_MUNICIPALITIES[0]);
  const [ghanaCardNumber, setGhanaCardNumber] = useState("");
  const [truckType, setTruckType] = useState<TruckType>("mini_truck");
  const [truckDisplayName, setTruckDisplayName] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [loadCapacityKg, setLoadCapacityKg] = useState("");
  const [dimensionLengthM, setDimensionLengthM] = useState("");
  const [dimensionWidthM, setDimensionWidthM] = useState("");
  const [dimensionHeightM, setDimensionHeightM] = useState("");
  const [cargoExamples, setCargoExamples] = useState("");
  const [ghanaCardImage, setGhanaCardImage] = useState<UploadAsset | null>(null);
  const [selfieImage, setSelfieImage] = useState<UploadAsset | null>(null);
  const [truckPhotos, setTruckPhotos] = useState<UploadAsset[]>([]);
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? darkTheme : lightTheme;

  useEffect(() => {
    if (!session?.user.id) {
      router.replace("/(auth)/login");
      return;
    }

    const loadProgress = async () => {
      try {
        const onboardingProgress = await getDriverOnboardingProgress(session.user.id);
        setProgress(onboardingProgress);
      } catch (error: unknown) {
        setErrorMessage(error instanceof Error ? error.message : "Unable to load onboarding status");
      } finally {
        setLoading(false);
      }
    };

    void loadProgress();
  }, [session?.user.id]);

  const canSubmit = useMemo(() => {
    return (
      !!municipality &&
      !!ghanaCardNumber.trim() &&
      !!truckDisplayName.trim() &&
      !!licensePlate.trim() &&
      !!loadCapacityKg.trim() &&
      !!dimensionLengthM.trim() &&
      !!dimensionWidthM.trim() &&
      !!dimensionHeightM.trim() &&
      !!ghanaCardImage &&
      !!selfieImage &&
      truckPhotos.length > 0
    );
  }, [
    dimensionHeightM,
    dimensionLengthM,
    dimensionWidthM,
    ghanaCardImage,
    ghanaCardNumber,
    licensePlate,
    loadCapacityKg,
    municipality,
    selfieImage,
    truckDisplayName,
    truckPhotos.length
  ]);

  const pickSingleImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      throw new Error("Photo permission is required to upload files.");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8
    });

    if (result.canceled || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    if (!asset) {
      return null;
    }
    const extension = getFileExtension(asset.fileName, asset.mimeType);
    return {
      uri: asset.uri,
      mimeType: asset.mimeType ?? "image/jpeg",
      extension
    } satisfies UploadAsset;
  };

  const handlePickGhanaCard = async () => {
    try {
      const file = await pickSingleImage();
      if (file) {
        setGhanaCardImage(file);
        setErrorMessage(null);
      }
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to pick Ghana Card image");
    }
  };

  const handlePickSelfie = async () => {
    try {
      const file = await pickSingleImage();
      if (file) {
        setSelfieImage(file);
        setErrorMessage(null);
      }
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to pick selfie image");
    }
  };

  const handleAddTruckPhoto = async () => {
    try {
      const file = await pickSingleImage();
      if (!file) {
        return;
      }
      setTruckPhotos((current) => [...current, file].slice(0, 6));
      setErrorMessage(null);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to add truck photo");
    }
  };

  const handleSubmit = async () => {
    if (!session?.user.id) {
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const updatedProgress = await submitDriverOnboarding({
        userId: session.user.id,
        municipalityName: municipality,
        ghanaCardNumber,
        truckType,
        truckDisplayName,
        licensePlate,
        loadCapacityKg,
        dimensionLengthM,
        dimensionWidthM,
        dimensionHeightM,
        cargoExamples,
        ghanaCardImage: ghanaCardImage as UploadAsset,
        selfieImage: selfieImage as UploadAsset,
        truckPhotos
      });

      setProgress(updatedProgress);
      setSuccessMessage("Onboarding submitted. We will review and approve your account shortly.");
      router.replace("/(driver)/home");
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to submit onboarding");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Driver onboarding</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Upload your verification documents and truck profile to start receiving jobs.
        </Text>

        {loading ? <ActivityIndicator style={{ marginTop: 16 }} color={theme.accent} /> : null}
        {progress && !loading ? (
          <View style={[styles.statusCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Current status</Text>
            <Text style={{ color: theme.textSecondary }}>
              {progress.complete
                ? "Complete - waiting for admin approval."
                : "Incomplete - fill all required onboarding steps."}
            </Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Identity verification</Text>
          <TextInput
            placeholder="Ghana Card number"
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.input,
              { backgroundColor: theme.surface, borderColor: theme.border, color: theme.textPrimary }
            ]}
            value={ghanaCardNumber}
            onChangeText={setGhanaCardNumber}
          />
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Municipality</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {ACCRA_MUNICIPALITIES.map((item) => (
              <Pressable
                key={item}
                onPress={() => setMunicipality(item)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: municipality === item ? theme.accent : theme.surface,
                    borderColor: theme.border
                  }
                ]}
              >
                <Text style={{ color: municipality === item ? "#101218" : theme.textPrimary, fontWeight: "700" }}>
                  {item}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.uploadRow}>
            <UploadTile
              label="Ghana Card upload"
              picked={Boolean(ghanaCardImage)}
              onPress={handlePickGhanaCard}
              previewUri={ghanaCardImage?.uri}
            />
            <UploadTile
              label="Selfie verification"
              picked={Boolean(selfieImage)}
              onPress={handlePickSelfie}
              previewUri={selfieImage?.uri}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Truck details</Text>
          <TextInput
            placeholder="Truck display name"
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.input,
              { backgroundColor: theme.surface, borderColor: theme.border, color: theme.textPrimary }
            ]}
            value={truckDisplayName}
            onChangeText={setTruckDisplayName}
          />
          <TextInput
            placeholder="License plate"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="characters"
            style={[
              styles.input,
              { backgroundColor: theme.surface, borderColor: theme.border, color: theme.textPrimary }
            ]}
            value={licensePlate}
            onChangeText={setLicensePlate}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {TRUCK_TYPE_OPTIONS.map((item) => (
              <Pressable
                key={item.value}
                onPress={() => setTruckType(item.value)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: truckType === item.value ? theme.accent : theme.surface,
                    borderColor: theme.border
                  }
                ]}
              >
                <Text style={{ color: truckType === item.value ? "#101218" : theme.textPrimary, fontWeight: "700" }}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.gridRow}>
            <TextInput
              placeholder="Capacity (kg)"
              keyboardType="numeric"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.input,
                styles.halfInput,
                { backgroundColor: theme.surface, borderColor: theme.border, color: theme.textPrimary }
              ]}
              value={loadCapacityKg}
              onChangeText={setLoadCapacityKg}
            />
            <TextInput
              placeholder="Length (m)"
              keyboardType="numeric"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.input,
                styles.halfInput,
                { backgroundColor: theme.surface, borderColor: theme.border, color: theme.textPrimary }
              ]}
              value={dimensionLengthM}
              onChangeText={setDimensionLengthM}
            />
          </View>
          <View style={styles.gridRow}>
            <TextInput
              placeholder="Width (m)"
              keyboardType="numeric"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.input,
                styles.halfInput,
                { backgroundColor: theme.surface, borderColor: theme.border, color: theme.textPrimary }
              ]}
              value={dimensionWidthM}
              onChangeText={setDimensionWidthM}
            />
            <TextInput
              placeholder="Height (m)"
              keyboardType="numeric"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.input,
                styles.halfInput,
                { backgroundColor: theme.surface, borderColor: theme.border, color: theme.textPrimary }
              ]}
              value={dimensionHeightM}
              onChangeText={setDimensionHeightM}
            />
          </View>
          <TextInput
            placeholder="Cargo examples (comma separated)"
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.input,
              { backgroundColor: theme.surface, borderColor: theme.border, color: theme.textPrimary }
            ]}
            value={cargoExamples}
            onChangeText={setCargoExamples}
          />
          <AppButton
            label={truckPhotos.length > 0 ? `Add truck photo (${truckPhotos.length}/6)` : "Upload truck photo"}
            variant="secondary"
            onPress={handleAddTruckPhoto}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
            {truckPhotos.map((photo, index) => (
              <View key={`${photo.uri}-${index}`} style={styles.photoWrap}>
                <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
                <Pressable
                  onPress={() =>
                    setTruckPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index))
                  }
                >
                  <Text style={{ color: theme.danger, textAlign: "center", marginTop: 4 }}>Remove</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </View>

        {errorMessage ? <Text style={[styles.message, { color: theme.danger }]}>{errorMessage}</Text> : null}
        {successMessage ? <Text style={[styles.message, { color: theme.success }]}>{successMessage}</Text> : null}

        <View style={styles.footerButtons}>
          <AppButton
            label={saving ? "Submitting..." : "Submit onboarding"}
            onPress={handleSubmit}
            disabled={!canSubmit || saving}
          />
          <AppButton label="Back to dashboard" variant="secondary" onPress={() => router.replace("/(driver)/home")} />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function UploadTile({
  label,
  picked,
  previewUri,
  onPress
}: {
  label: string;
  picked: boolean;
  previewUri?: string;
  onPress: () => void;
}) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? darkTheme : lightTheme;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.uploadTile, { borderColor: theme.border, backgroundColor: theme.surface }]}
    >
      {previewUri ? <Image source={{ uri: previewUri }} style={styles.uploadPreview} /> : null}
      <Text style={{ color: theme.textPrimary, fontWeight: "700", textAlign: "center" }}>{label}</Text>
      <Text style={{ color: picked ? theme.success : theme.textSecondary, marginTop: 4 }}>
        {picked ? "Uploaded" : "Tap to upload"}
      </Text>
    </Pressable>
  );
}

function getFileExtension(fileName?: string | null, mimeType?: string | null) {
  if (fileName && fileName.includes(".")) {
    return fileName.split(".").pop()?.toLowerCase() ?? "jpg";
  }

  if (mimeType && mimeType.includes("/")) {
    return mimeType.split("/").pop() ?? "jpg";
  }

  return "jpg";
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: "800"
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22
  },
  statusCard: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6
  },
  section: {
    marginTop: 24,
    gap: 10
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700"
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 15
  },
  chipRow: {
    gap: 8,
    paddingVertical: 2
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  uploadRow: {
    flexDirection: "row",
    gap: 10
  },
  uploadTile: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 150,
    alignItems: "center",
    justifyContent: "center",
    padding: 10
  },
  uploadPreview: {
    width: 74,
    height: 74,
    borderRadius: 10,
    marginBottom: 8
  },
  gridRow: {
    flexDirection: "row",
    gap: 8
  },
  halfInput: {
    flex: 1
  },
  photoRow: {
    gap: 10,
    marginTop: 4
  },
  photoWrap: {
    width: 110
  },
  photoPreview: {
    width: 110,
    height: 86,
    borderRadius: 12
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20
  },
  footerButtons: {
    marginTop: 20,
    marginBottom: 20,
    gap: 10
  }
});
