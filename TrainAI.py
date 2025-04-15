#%% 1. INITIAL SETUP
import pandas as pd
import numpy as np
import seaborn as sns
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.preprocessing import OneHotEncoder
from sklearn.impute import SimpleImputer
from datetime import datetime
from xgboost import XGBRegressor
from sklearn.compose import ColumnTransformer

sns.set(style="whitegrid")

#%% 2. DATA LOADING
def load_cleaned_data(file_path):
    df = pd.read_csv(file_path, 
                    dtype={'postcode': 'category',
                          'borough': 'category'},
                    parse_dates=['dateoftransfer'])  # Ensure correct dtype
    return df

# Load cleaned dataset from CSV
cleaned_df = load_cleaned_data("C:/Users/Avneet Singh/OneDrive/Documents/Forward/Bath/Academics/Semester 2/Entrepreneurship Coursework/Part 2/ML Model/cleaned_data.csv")

#%% 3. FEATURE ENGINEERING
def engineer_features(df):
    # Temporal features
    df['sale_month'] = df['dateoftransfer'].dt.month
    df['sale_quarter'] = df['dateoftransfer'].dt.quarter
    
    # Extract the year
    df['sale_year'] = pd.to_datetime(df['dateoftransfer']).dt.year

    # Size features
    df['price_per_room'] = df['price'] / df['numberrooms']

    return df

engineered_df = engineer_features(cleaned_df.copy())

#%% 4. MODELING 

# Define features and target
X = engineered_df[['propertytype', 'duration', 'numberrooms',
                  'sale_quarter', 'tfarea', 'sale_year', 'CONSTRUCTION_AGE_BAND', 'borough']]
y = engineered_df['price']

# Remove rows where X has NaN values
X = X.dropna()
y = y[X.index] # ensure that y only contains the ones with valid indices in X

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Handle categorical features
categorical_features = ['propertytype', 'duration', 'borough']
numerical_features = ['numberrooms', 'sale_quarter', 'tfarea', 'sale_year', 'CONSTRUCTION_AGE_BAND']

# Create preprocessor
preprocessor = ColumnTransformer(
    transformers=[
        ('num', SimpleImputer(strategy='median'), numerical_features),
        ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)
    ])

X_train_transformed = preprocessor.fit_transform(X_train)
X_test_transformed = preprocessor.transform(X_test)

# Train model
model = XGBRegressor(n_estimators=200, random_state=42, n_jobs=-1) # Use XGBoost Regressor
model.fit(X_train_transformed, y_train)

# Evaluate
y_pred = model.predict(X_test_transformed)
rmse = np.sqrt(mean_squared_error(y_test, y_pred))
r2 = r2_score(y_test, y_pred)
print(f"RMSE: {rmse:.2f}")
print(f"R²: {r2:.2f}")

#%% 5. FUTURE PREDICTIONS
def predict_future(model, df, preprocessor, years=3, n_samples=165):
    # Descriptions of what property type and duration represents
    property_type_mapping = {'D': 'Detached', 'S': 'Semi-Detached', 'T': 'Terraced', 'F': 'Flats/Maisonettes'}
    duration_mapping = {'F': 'Freehold', 'L': 'Leasehold'}

    # Ensure 'sale_year' column exists
    if 'sale_year' not in df.columns:
        print("Adding 'sale_year' column in predict_future function.")
        df['sale_year'] = pd.to_datetime(df['dateoftransfer']).dt.year
    
    # Calculate average price per sqm for 2024 from the cleaned dataset
    avg_price_per_sqm_2024 = {}
    for borough in df['borough'].unique():
        df_borough = df[df['borough'] == borough]
        df_2024 = df_borough[df_borough['sale_year'] == 2024]
        
        #If year / prices are not defined.
        if 'price' not in df_2024.columns or 'tfarea' not in df_2024.columns:
            print(f"Price or TfArea are non-existant to parse {borough} for year = 2024")
            avg_price_per_sqm_2024[borough] = None
        else:
            if not df_2024.empty:
                avg_price_per_sqm_2024[borough] = (df_2024['price'] / df_2024['tfarea']).mean()
            #Price is empty if it could not resolve.
            else:
                print(f"Empty - setting as null to parse {borough} for year = 2024")
                avg_price_per_sqm_2024[borough] = None

    last_year = df['sale_year'].max()
    future_years_list = list(range(last_year + 1, last_year + years + 1))
    
    future_predictions = []
    boroughs = df['borough'].unique()

    #Each borough should have "5" (as of writing of response) entries.
    n_samples_per_borough = 5

    #Iterate over boroughs in keys.
    for borough in boroughs:
        #Specific borough selected.
        df_borough = df[df['borough'] == borough]

        #If the data does not exist, do a non-action so there isn't a fatal crash.
        if df_borough.empty:
            print(f"Skipping {borough} borough due to it being empty. No future values associated to it.")
            continue
        #Use these values for calculation of future.
        for i in range(n_samples_per_borough):
            try:
                sample = df_borough.sample(n=1, random_state=i).iloc[0]
            except ValueError as e:
                print(f"Non-fatal error for {borough} due to it being insufficent: {e}. Continuing...")
                continue
                
            # Get 2024 price per sqm for the borough
            historical_price_sqm = avg_price_per_sqm_2024.get(borough)
                
            for year in future_years_list:
                future_data = pd.DataFrame({
                    'propertytype': [sample['propertytype']],
                    'duration': [sample['duration']],
                    'numberrooms': [sample['numberrooms']],
                    'sale_quarter': [sample['sale_quarter']],
                    'tfarea': [sample['tfarea']],
                    'sale_year': [year],
                    'CONSTRUCTION_AGE_BAND': [sample['CONSTRUCTION_AGE_BAND']],
                    'borough': [sample['borough']],
                    'postcode': [sample['postcode'] if 'postcode' in sample else None]
                })

                future_transformed = preprocessor.transform(future_data)
                future_price = model.predict(future_transformed)[0]
                price_per_sqm = future_price / sample['tfarea'] if sample['tfarea'] != 0 else np.nan
              

                future_predictions.append([
                                        year,
                                        historical_price_sqm,
                                        price_per_sqm,
                                        future_price,
                                        sample['tfarea'],
                                        property_type_mapping.get(sample['propertytype'], sample['propertytype']),
                                        sample['numberrooms'],
                                        duration_mapping.get(sample['duration'], sample['duration']),
                                        sample['borough'],
                                        sample['postcode'] if 'postcode' in sample else None
                                    ])


    #Convert to DataFrame and return
    future_df = pd.DataFrame(future_predictions, columns=['Year', 'Historical 2024 Price/sqm', 'Predicted Price/sqm', 'Predicted Price', 'Area', 'Property Type', 'Number of Rooms', 'Duration', 'Borough', 'Postcode'])

    return future_df

try:
    all_boroughs = cleaned_df['borough'].unique()

    #Feature and Matrix define and transform
    X = engineered_df[['propertytype', 'duration', 'numberrooms', 'sale_quarter', 'tfarea', 'sale_year', 'CONSTRUCTION_AGE_BAND', 'borough']]
    y = engineered_df['price']
    X = X.dropna()
    y = y[X.index]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    categorical_features = ['propertytype', 'duration', 'borough']
    numerical_features = ['numberrooms', 'sale_quarter', 'tfarea', 'sale_year', 'CONSTRUCTION_AGE_BAND']

    preprocessor = ColumnTransformer(transformers=[('num', SimpleImputer(strategy='median'), numerical_features), ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)])

    X_train_transformed = preprocessor.fit_transform(X_train)
    X_test_transformed = preprocessor.transform(X_test)

    #Train the Model Here
    model = XGBRegressor(n_estimators=200, random_state=42, n_jobs=-1)
    model.fit(X_train_transformed, y_train)
except Exception as e:
    print(f"Failure in model declaration: {e}")
    exit()

# Predict Here.
try:
    future_df = predict_future(model, engineered_df, preprocessor, years=3, n_samples=5*len(cleaned_df['borough'].unique()))

    # Export to CSV
    future_df.to_csv("C:/Users/Avneet Singh/OneDrive/Documents/Forward/Bath/Academics/Semester 2/Entrepreneurship Coursework/Part 2/ML Model/future_predictions.csv", index=False)
    print(f"Saved to C:/Users/Avneet Singh/OneDrive/Documents/Forward/Bath/Academics/Semester 2/Entrepreneurship Coursework/Part 2/ML Model/future_predictions.csv")

except Exception as e:
    print(f"Failure in predict future section: {e}")
