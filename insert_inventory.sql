-- ============================================================================
-- Script Name : insert_inventory.sql
-- Application : SPIL Mini ERP
-- Target DB   : SpilMiniERP
-- Target Table: [dbo].[Inventory]
-- Description : Complete SQL script to initialize and seed 20 sample inventory items.
--               Safe to run multiple times (idempotent - updates or inserts based on SKU).
-- Compatible  : SQL Server (both .\MSSQLSERVER01 and default localhost instances)
-- ============================================================================

-- 1. Create Database if it does not exist
IF NOT EXISTS (SELECT 1 FROM sys.databases WHERE name = N'SpilMiniERP')
BEGIN
    PRINT 'Database [SpilMiniERP] not found. Creating database...';
    CREATE DATABASE [SpilMiniERP];
    PRINT 'Database [SpilMiniERP] created successfully.';
END
GO

USE [SpilMiniERP];
GO

-- 2. Create Table if it does not exist (matches EF Core migration schema)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = N'Inventory' AND type = 'U')
BEGIN
    PRINT 'Table [dbo].[Inventory] not found. Creating table...';
    CREATE TABLE [dbo].[Inventory] (
        [Id] INT IDENTITY(1, 1) NOT NULL,
        [SKU] NVARCHAR(50) NOT NULL,
        [Name] NVARCHAR(150) NOT NULL,
        [Description] NVARCHAR(MAX) NULL,
        [QuantityAvailable] INT NOT NULL,
        [UnitPrice] DECIMAL(18, 2) NOT NULL,
        [IsActive] BIT NOT NULL CONSTRAINT [DF_Inventory_IsActive] DEFAULT 1,
        CONSTRAINT [PK_Inventory] PRIMARY KEY CLUSTERED ([Id] ASC)
    );
    CREATE UNIQUE NONCLUSTERED INDEX [IX_Inventory_SKU] ON [dbo].[Inventory] ([SKU] ASC);
    PRINT 'Table [dbo].[Inventory] and index created successfully.';
END
GO

PRINT '==================================================';
PRINT 'Starting Sample Inventory Ingestion (20 items)...';
PRINT '==================================================';

BEGIN TRANSACTION;

BEGIN TRY
    -- 3. Staging table for 20 sample items
    DECLARE @SampleInventory TABLE (
        [SKU] NVARCHAR(50) NOT NULL,
        [Name] NVARCHAR(150) NOT NULL,
        [Description] NVARCHAR(MAX) NULL,
        [QuantityAvailable] INT NOT NULL,
        [UnitPrice] DECIMAL(18, 2) NOT NULL,
        [IsActive] BIT NOT NULL
    );

    INSERT INTO @SampleInventory ([SKU], [Name], [Description], [QuantityAvailable], [UnitPrice], [IsActive])
    VALUES
        -- 1-4. Raw Materials & Metals
        (N'SKU-RM-STL-001', N'Cold Rolled Steel Sheet 2.0mm', N'Standard 2.0mm mild steel sheet 1250x2500mm for fabrication', 120, 48.50, 1),
        (N'SKU-RM-ALU-002', N'Aluminum Alloy Bar 6061-T6 (25mm dia)', N'Extruded round aluminum bar 6061-T6, 3-meter length', 85, 34.75, 1),
        (N'SKU-RM-CPR-003', N'Pure Copper Busbar 50x5mm', N'High conductivity copper flat strip 50x5mm x 2m', 40, 72.00, 1),
        (N'SKU-RM-SS-004',  N'Stainless Steel Sheet 304 3.0mm', N'Industrial grade corrosion-resistant stainless sheet 1000x2000mm', 50, 85.00, 1),

        -- 5-8. Fasteners & Hardware
        (N'SKU-FST-BLT-101', N'Hex Head Bolt M10 x 50mm (Grade 8.8)', N'Zinc plated high tensile steel hex bolts (Pack of 100)', 500, 15.20, 1),
        (N'SKU-FST-NUT-102', N'Nylon Insert Lock Nut M10', N'Grade 8 galvanized nyloc hex lock nuts (Pack of 100)', 750, 9.50, 1),
        (N'SKU-FST-WSH-103', N'Flat Washer M10 Form A', N'DIN 125 stainless steel A2 plain flat washers (Pack of 200)', 600, 6.80, 1),
        (N'SKU-FST-SCR-104', N'Socket Cap Screw M6 x 25mm', N'Black oxide alloy steel hex socket cap screws (Pack of 100)', 350, 12.00, 1),

        -- 9-13. Electrical, Controls & Automation
        (N'SKU-ELE-RLY-201', N'Industrial Power Relay 24VDC 10A DPDT', N'DIN-rail mounted 8-pin plug-in power relay with LED indicator', 95, 18.50, 1),
        (N'SKU-ELE-MCB-202', N'Miniature Circuit Breaker 16A 2-Pole C-Curve', N'DIN rail 10kA modular thermal-magnetic circuit breaker', 60, 24.90, 1),
        (N'SKU-ELE-SNS-203', N'Inductive Proximity Sensor M12 PNP NO', N'Flush mount inductive sensor, 4mm sensing distance, 10-30VDC', 45, 32.00, 1),
        (N'SKU-ELE-TRM-204', N'Spring-Clamp Terminal Block 4mm² Grey', N'Feed-through modular terminal block DIN-35 rail (Pack of 50)', 200, 28.00, 1),
        (N'SKU-ELE-VFD-205', N'Variable Frequency Drive 0.75kW 230V 1-Phase', N'Compact AC motor speed controller with built-in EMC filter', 15, 165.00, 1),

        -- 14-17. Pneumatics & Actuators
        (N'SKU-PNE-CYL-301', N'Compact Pneumatic Cylinder 32mm Bore 50mm Stroke', N'Double acting aluminum body air cylinder with magnetic piston', 30, 65.00, 1),
        (N'SKU-PNE-FTG-302', N'Push-In Pneumatic Fitting 8mm x 1/4" BSPT', N'Nickel plated brass push-to-connect tube fitting (Pack of 10)', 150, 14.50, 1),
        (N'SKU-PNE-TUB-303', N'Polyurethane Air Tubing 8mm OD Blue (100m Roll)', N'Flexible pneumatic PU tubing 8mm OD x 5.5mm ID', 25, 42.00, 1),
        (N'SKU-PNE-VLV-304', N'5/2 Way Solenoid Valve 24VDC 1/4" Port', N'Pilot-operated directional control pneumatic valve with manual override', 40, 38.50, 1),

        -- 18-19. Maintenance & Consumables
        (N'SKU-CSM-OIL-401', N'Industrial Gear Oil ISO VG 220 (5 Liters)', N'Heavy-duty extreme pressure mineral gear lubricant', 35, 38.00, 1),
        (N'SKU-CSM-WLD-402', N'MIG Welding Wire ER70S-6 0.8mm (15kg Spool)', N'Copper coated mild steel solid welding wire', 40, 49.50, 1),

        -- 20. Packaging
        (N'SKU-PKG-BOX-501', N'Heavy-Duty Corrugated Shipping Box 400x300x250mm', N'Double wall kraft cardboard shipping carton (Bundle of 25)', 180, 29.50, 1);

    -- 4. Upsert (MERGE) logic: Update existing SKUs or Insert new ones
    MERGE INTO [dbo].[Inventory] AS target
    USING @SampleInventory AS source
    ON (target.[SKU] = source.[SKU])
    WHEN MATCHED THEN
        UPDATE SET 
            target.[Name] = source.[Name],
            target.[Description] = source.[Description],
            target.[QuantityAvailable] = source.[QuantityAvailable],
            target.[UnitPrice] = source.[UnitPrice],
            target.[IsActive] = source.[IsActive]
    WHEN NOT MATCHED THEN
        INSERT ([SKU], [Name], [Description], [QuantityAvailable], [UnitPrice], [IsActive])
        VALUES (source.[SKU], source.[Name], source.[Description], source.[QuantityAvailable], source.[UnitPrice], source.[IsActive]);

    COMMIT TRANSACTION;
    PRINT 'Inventory upsert completed successfully.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    PRINT 'Error occurred during inventory insertion:';
    PRINT CONCAT('Msg ', ERROR_NUMBER(), ': ', ERROR_MESSAGE());
END CATCH;
GO

-- ============================================================================
-- VERIFICATION & SUMMARY AUDIT
-- ============================================================================
PRINT '==================================================';
PRINT 'Inventory Summary Audit';
PRINT '==================================================';

SELECT 
    COUNT(*) AS [TotalProductsCount],
    SUM(CASE WHEN [IsActive] = 1 THEN 1 ELSE 0 END) AS [ActiveProductsCount],
    SUM([QuantityAvailable]) AS [TotalUnitsInStock],
    CAST(SUM([QuantityAvailable] * [UnitPrice]) AS DECIMAL(18, 2)) AS [TotalInventoryValuationUSD]
FROM [dbo].[Inventory];

SELECT 
    [Id],
    [SKU],
    [Name],
    [QuantityAvailable] AS [Stock],
    [UnitPrice] AS [Price],
    [IsActive] AS [Active],
    LEFT([Description], 40) + '...' AS [DescriptionPreview]
FROM [dbo].[Inventory]
ORDER BY [Id] ASC;
GO
