/**
 * Benchmark & Simulation Suite for ShramikSetu Dataset Operations
 * Tests with 1,000, 5,000, 10,000, and 25,000 records.
 * Measures:
 * 1. Monolithic full-payload size vs. Server-side paged payload size (50 records)
 * 2. Summary computation time
 * 3. Server-side filtering & slice time
 * 4. In-place status update timing
 */

const BLOCKS = ['Sanakhemundi', 'Digapahandi', 'Hinjilicut', 'Chhatrapur', 'Aska', 'Kabisuryanagar', 'Polasara', 'Purushottampur'];
const SERVICES = ['New Card', 'Card Renewal', 'Maternity Benefit Apply', 'Death Benefit Apply', 'Marriage Benefit Apply', 'Education Assistance Apply'];
const STATUSES = ['Pending', 'E-Sign Pending', 'In Progress', 'Query Raised', 'Query Replied', 'Approved', 'Bank Reject'];

function generateSampleDataset(count) {
  const dataset = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const service = SERVICES[i % SERVICES.length];
    const block = BLOCKS[i % BLOCKS.length];
    const status = STATUSES[i % STATUSES.length];
    dataset.push({
      id: `SS-${now - i * 1000}`,
      serviceType: service,
      applicantName: `BENEFICIARY APPLICANT ${i + 1}`,
      cardNo: `OD-GM-2024-${String(100000 + i)}`,
      aadhaarNo: `XXXX-XXXX-${String(1000 + (i % 9000))}`,
      trackNo: `TRK-${1000000 + i}`,
      district: 'Ganjam',
      block: block,
      agent: `Agent ${(i % 15) + 1}`,
      officer: status === 'Query Raised' ? 'Document clarification required' : '',
      status: status,
      phone: `98765${String(10000 + (i % 90000))}`,
      remarks: '',
      createdAt: new Date(now - (i % 30) * 86400000).toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
  return dataset;
}

function runBenchmarks() {
  console.log('================================================================');
  console.log('SHRAMIKSETU DATASET PERFORMANCE & ARCHITECTURE BENCHMARK');
  console.log('================================================================\n');

  const testSizes = [1000, 5000, 10000, 25000];

  testSizes.forEach(size => {
    console.log(`>>> BENCHMARKING DATASET SIZE: ${size.toLocaleString()} RECORDS <<<`);
    const dataset = generateSampleDataset(size);

    // 1. Payload size analysis
    const fullJson = JSON.stringify(dataset);
    const fullPayloadBytes = Buffer.byteLength(fullJson, 'utf8');
    const fullPayloadKB = (fullPayloadBytes / 1024).toFixed(1);

    // 50-record paged payload (Optimized architecture)
    const pagedSlice = dataset.slice(0, 50);
    const pagedJson = JSON.stringify({
      success: true,
      page: 1,
      pageSize: 50,
      totalRecords: size,
      totalPages: Math.ceil(size / 50),
      data: pagedSlice
    });
    const pagedPayloadBytes = Buffer.byteLength(pagedJson, 'utf8');
    const pagedPayloadKB = (pagedPayloadBytes / 1024).toFixed(1);
    const reductionPercent = (((fullPayloadBytes - pagedPayloadBytes) / fullPayloadBytes) * 100).toFixed(1);

    console.log(`  [Payload Size] Full Raw Download: ${fullPayloadKB} KB`);
    console.log(`  [Payload Size] Server-Side Paged (50 rows): ${pagedPayloadKB} KB`);
    console.log(`  [Payload Reduction]: ${reductionPercent}% reduction in network payload!`);

    // 2. Summary computation latency
    const t0 = performance.now();
    let totalActive = 0, pending = 0, inProgress = 0, approved = 0;
    const catCounts = {};
    for (let i = 0; i < dataset.length; i++) {
      const row = dataset[i];
      totalActive++;
      catCounts[row.serviceType] = (catCounts[row.serviceType] || 0) + 1;
      const st = row.status.toLowerCase();
      if (st.includes('pending')) pending++;
      else if (st.includes('progress')) inProgress++;
      else if (st.includes('approved')) approved++;
    }
    const summaryTimeMs = (performance.now() - t0).toFixed(2);
    console.log(`  [Server-Side Summary Computation]: ${summaryTimeMs} ms`);

    // 3. Search & Filter latency
    const t1 = performance.now();
    const query = 'applicant 49';
    const filtered = dataset.filter(a => 
      a.applicantName.toLowerCase().includes(query) ||
      a.trackNo.toLowerCase().includes(query)
    );
    const pagedResult = filtered.slice(0, 50);
    const filterTimeMs = (performance.now() - t1).toFixed(2);
    console.log(`  [Search & Pagination Slice (query="${query}")]: ${filterTimeMs} ms (Found: ${filtered.length})`);

    // 4. Targeted status update latency (in-place)
    const t2 = performance.now();
    const target = dataset[Math.floor(size / 2)];
    target.status = 'Approved';
    target.updatedAt = new Date().toISOString();
    const updateTimeMs = (performance.now() - t2).toFixed(4);
    console.log(`  [Targeted In-Place Status Update]: ${updateTimeMs} ms\n`);
  });

  console.log('================================================================');
  console.log('ALL SIMULATION BENCHMARKS COMPLETED SUCCESSFULLY');
  console.log('================================================================');
}

runBenchmarks();
