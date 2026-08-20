import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DAILY_SWING_COMBINED_BROAD_TRAIN_DIAGNOSTIC_PROTOCOL } from "@/lib/analysis/combined-broad-train-diagnostics";

describe("combined broad train diagnostic protocol", () => {
	it("freezes the rejected report and train-only fold source", () => {
		assert.equal(
			DAILY_SWING_COMBINED_BROAD_TRAIN_DIAGNOSTIC_PROTOCOL.sources.foldDataset
				.sha256,
			"6bc63cb4559b2334708110fcd15719eb52d7f0bb9100b8f0032e4e42a1e0f9c9",
		);
		assert.equal(
			DAILY_SWING_COMBINED_BROAD_TRAIN_DIAGNOSTIC_PROTOCOL.sources
				.rejectedDevelopmentReport.sha256,
			"02d6944aa433aac2f5a1b7eb75e4308eca130baaceb8bee1a8abeab957018705",
		);
		assert.equal(
			DAILY_SWING_COMBINED_BROAD_TRAIN_DIAGNOSTIC_PROTOCOL.sources
				.rejectedDevelopmentReport.decision,
			"reject_development",
		);
	});

	it("allows only frozen out-of-fold diagnostics with sealed holdouts", () => {
		const protocol = DAILY_SWING_COMBINED_BROAD_TRAIN_DIAGNOSTIC_PROTOCOL;
		assert.equal(protocol.representativeModel.candidateId, "l2-logistic-0.3");
		assert.equal(protocol.representativeModel.newModelSelectionAuthorized, false);
		assert.equal(protocol.featureDrift.automaticFeatureSelection, false);
		assert.equal(protocol.dataAccess.validationLabelsRead, false);
		assert.equal(protocol.dataAccess.testLabelsRead, false);
		assert.equal(protocol.nextResearchDecision.authorizesModelFitting, false);
		assert.equal(protocol.output.overwrite, false);
	});

	it("forbids tuning and symbol-level outcome searches", () => {
		const prohibitions =
			DAILY_SWING_COMBINED_BROAD_TRAIN_DIAGNOSTIC_PROTOCOL.prohibitions.join(
				" ",
			);
		assert.match(prohibitions, /additional penalties/);
		assert.match(prohibitions, /rank instruments/);
		assert.match(prohibitions, /validation or test/);
	});
});
