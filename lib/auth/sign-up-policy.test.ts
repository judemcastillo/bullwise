import assert from "node:assert/strict";
import test from "node:test";

import { validateSignUpData } from "./sign-up-policy";

const validInput = {
	fullName: "Ada Lovelace",
	email: "ADA@example.com",
	password: "secure-password",
};

test("sign-up validation accepts and normalizes valid details", () => {
	const result = validateSignUpData(validInput);

	assert.equal(result.success, true);
	if (result.success) {
		assert.equal(result.data.email, "ada@example.com");
		assert.equal(result.data.fullName, "Ada Lovelace");
	}
});

test("sign-up validation rejects malformed runtime payloads", () => {
	for (const input of [null, undefined, [], "invalid"]) {
		assert.equal(validateSignUpData(input).success, false);
	}
});

test("sign-up validation rejects invalid account fields", () => {
	assert.equal(
		validateSignUpData({ ...validInput, fullName: "A" }).success,
		false,
	);
	assert.equal(
		validateSignUpData({ ...validInput, email: "not-an-email" }).success,
		false,
	);
	assert.equal(
		validateSignUpData({ ...validInput, password: "short" }).success,
		false,
	);
});
