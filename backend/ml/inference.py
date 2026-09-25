import joblib
import numpy as np
import shap

import os

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "compressed_random_forest_model.pkl")


model = joblib.load(MODEL_PATH)
explainer = shap.TreeExplainer(model)


FEATURE_ORDER = [
    "age",
    "income",
    "loanAmount",
    "creditScore",
    "monthsEmployed",
    "numCreditLines",
    "interestRate",
    "loanTerm",
    "dtiRatio",
    "hasMortgage",
    "hasDependents",
    "hasCoSigner",
    "educationHighSchool",
    "educationMasters",
    "educationPhd",
    "employmentTypePartTime",
    "employmentTypeSelfEmployed",
    "employmentTypeUnemployed",
    "maritalStatusMarried",
    "maritalStatusSingle",
    "loanPurposeBusiness",
    "loanPurposeEducation",
    "loanPurposeHome",
    "loanPurposeOther",
]


def _to_numeric(value):
    # sklearn wants numbers, not Python bools, for the boolean features.
    if isinstance(value, bool):
        return int(value)
    return value


def _extract_positive_class_shap(raw_shap_values):
    """
    Normalizes SHAP's output shape into a flat array of per-feature
    contributions toward the positive class (Default=1), for one row.
    Shape varies across shap library versions, hence the branching.
    """
    if isinstance(raw_shap_values, list):
        # Older SHAP: a list of one array per class.
        return np.array(raw_shap_values[1][0])

    values = np.array(raw_shap_values)
    if values.ndim == 3:
        # (n_samples, n_features, n_classes)
        return values[0, :, 1]
    # (n_samples, n_features) — already single-output
    return values[0]


def predict_and_explain(feature_data):
    """
    feature_data: dict with the 24 camelCase feature keys (booleans as
    Python bools, numbers as int/float — matches what the frontend sends).

    Returns (risk_score, shap_values):
      risk_score  -> float, 0-1, probability of default
      shap_values -> dict of {feature_name: contribution}, same keys as
                     FEATURE_ORDER, for this specific prediction
    """
    ordered_values = [_to_numeric(feature_data[key]) for key in FEATURE_ORDER]
    input_row = np.array([ordered_values])

    risk_score = float(model.predict_proba(input_row)[0][1])

    raw_shap_values = explainer.shap_values(input_row)
    positive_class_shap = _extract_positive_class_shap(raw_shap_values)

    shap_values = {
        feature: float(value)
        for feature, value in zip(FEATURE_ORDER, positive_class_shap)
    }

    return risk_score, shap_values